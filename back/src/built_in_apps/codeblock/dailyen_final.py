from moviepy import ImageClip, AudioFileClip, concatenate_videoclips
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import os
import json
import logging
import time

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

VIDEO_WIDTH = 1280
VIDEO_HEIGHT = 720
FPS = 24
MIN_DURATION = 2
EXTRA_PAUSE = 0.5
BG_COLOR = (30, 30, 60)
TEXT_COLOR = (255, 255, 255)
ACCENT_COLOR = (255, 200, 100)
OUTPUT_DIR = "/tmp"

# 解析 lazyllm-query 格式
LAZYLLM_QUERY_PREFIX = "<lazyllm-query>"
def merge_audio_files(audio_path1, audio_path2, output_path=None):
    """合并两个音频文件（按顺序拼接）"""
    if not audio_path1 or not audio_path2:
        return audio_path1 or audio_path2
    
    if not os.path.exists(audio_path1) or not os.path.exists(audio_path2):
        logger.warning(f"音频文件不存在，无法合并")
        return audio_path1 if os.path.exists(audio_path1) else audio_path2
    
    try:
        from moviepy import concatenate_audioclips
        
        audio1 = AudioFileClip(audio_path1)
        audio2 = AudioFileClip(audio_path2)
        
        # 拼接音频
        merged_audio = concatenate_audioclips([audio1, audio2])
        
        # 生成输出路径
        if not output_path:
            output_path = OUTPUT_DIR + "/merged_audio_temp.mp3"
        
        # 写入合并后的音频
        merged_audio.write_audiofile(output_path, codec='mp3', logger=None)
        
        # 清理资源
        audio1.close()
        audio2.close()
        merged_audio.close()
        
        logger.info(f"音频合并成功: {output_path}")
        return output_path
        
    except Exception as e:
        logger.error(f"音频合并失败: {e}")
        return audio_path1
def decode_query_with_filepaths(query_files: str):
    """解析 lazyllm-query 格式，提取文件路径"""
    if not isinstance(query_files, str):
        return query_files
    
    query_files = query_files.strip()
    if query_files.startswith(LAZYLLM_QUERY_PREFIX):
        try:
            json_str = query_files[len(LAZYLLM_QUERY_PREFIX):]
            obj = json.loads(json_str)
            # 返回第一个文件路径，如果有多个文件
            if isinstance(obj, dict) and 'files' in obj and len(obj['files']) > 0:
                return obj['files'][0]
            return None
        except (json.JSONDecodeError, KeyError, IndexError) as e:
            logger.error(f"解析 lazyllm-query 失败: {e}, 原始内容: {query_files}")
            return None
    else:
        # 如果不是 lazyllm-query 格式，直接返回
        return query_files if query_files else None

def extract_file_path(file_input, wait_for_file=False, max_wait_seconds=5):
    """从输入中提取文件路径（通用函数，用于音频和图片）
    
    Args:
        file_input: 输入的文件路径或 lazyllm-query 格式字符串
        wait_for_file: 如果文件不存在，是否等待文件生成
        max_wait_seconds: 最大等待时间（秒）
    """
    if not file_input:
        return None
    
    # 如果是字符串，尝试解析
    if isinstance(file_input, str):
        # 检查是否是错误信息
        if "rate limit" in file_input.lower() or "error" in file_input.lower():
            logger.warning(f"检测到可能的错误信息，跳过: {file_input[:100]}")
            return None
        
        path = decode_query_with_filepaths(file_input)
        if not path:
            # 如果解析失败，尝试直接使用
            path = file_input
        
        # 检查文件是否存在
        if path:
            # 如果文件不存在且需要等待，尝试等待
            if wait_for_file and not os.path.exists(path):
                logger.info(f"文件不存在，等待生成: {path}")
                waited = 0
                while waited < max_wait_seconds and not os.path.exists(path):
                    time.sleep(0.5)
                    waited += 0.5
                if os.path.exists(path):
                    logger.info(f"文件已生成: {path}")
                else:
                    logger.warning(f"等待超时，文件仍未生成: {path}")
            
            # 如果文件存在，进行大小写不敏感查找（仅针对 /app/upload/ 和 /tmp/ 路径）
            if os.path.exists(path):
                return path
            elif path.startswith("/app/upload/") or path.startswith("/tmp/"):
                # 尝试大小写不敏感查找
                dir_name = os.path.dirname(path)
                base_name = os.path.basename(path)
                if os.path.exists(dir_name):
                    for f_name in os.listdir(dir_name):
                        if f_name.lower() == base_name.lower():
                            found_path = os.path.join(dir_name, f_name)
                            logger.info(f"找到大小写不匹配的文件: {found_path} (原路径: {path})")
                            return found_path
    
    # 如果是列表，取第一个
    if isinstance(file_input, list) and len(file_input) > 0:
        path = extract_file_path(file_input[0], wait_for_file, max_wait_seconds)
        if path:
            return path
    
    return None

def extract_audio_path(audio_input):
    """从输入中提取音频文件路径"""
    return extract_file_path(audio_input)

def get_font(size):
    font_paths = [
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for font_path in font_paths:
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size)
            except:
                continue
    return ImageFont.load_default()

def create_text_image(texts, title=None, corner_word=None):
    img = Image.new('RGB', (VIDEO_WIDTH, VIDEO_HEIGHT), color=BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # 左上角显示单词
    if corner_word:
        corner_font = get_font(24)
        draw.text((20, 20), corner_word, font=corner_font, fill=(180, 180, 180))
    
    if title:
        title_font = get_font(36)
        title_bbox = draw.textbbox((0, 0), title, font=title_font)
        title_width = title_bbox[2] - title_bbox[0]
        draw.text(((VIDEO_WIDTH - title_width) // 2, 40), title, 
                  font=title_font, fill=ACCENT_COLOR)
    
    for text, font_size, color, y_pos in texts:
        if not text:
            continue
        font = get_font(font_size)
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        x_pos = (VIDEO_WIDTH - text_width) // 2
        draw.text((x_pos, y_pos), text, font=font, fill=color)
    
    return np.array(img)

def create_scene_image(scene_image_path, title="记忆场景", corner_word=None):
    img = Image.new('RGB', (VIDEO_WIDTH, VIDEO_HEIGHT), color=BG_COLOR)
    img = Image.new('RGB', (VIDEO_WIDTH, VIDEO_HEIGHT), color=BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # 左上角显示单词
    if corner_word:
        corner_font = get_font(24)
        draw.text((20, 20), corner_word, font=corner_font, fill=(180, 180, 180))
    
    title_font = get_font(36)
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    draw.text(((VIDEO_WIDTH - title_width) // 2, 30), title, 
              font=title_font, fill=ACCENT_COLOR)
    
    # 解析图片路径（可能是 lazyllm-query 格式），并等待文件生成
    actual_image_path = extract_file_path(scene_image_path, wait_for_file=True, max_wait_seconds=10)
    
    if actual_image_path:
        # 再次检查文件是否存在且可读
        if os.path.exists(actual_image_path) and os.access(actual_image_path, os.R_OK):
            try:
                logger.info(f"加载场景图片: {actual_image_path}")
                # 检查文件大小，确保文件已完全写入
                file_size = os.path.getsize(actual_image_path)
                if file_size == 0:
                    logger.warning(f"场景图片文件大小为0，可能未完全生成: {actual_image_path}")
                else:
                    scene_img = Image.open(actual_image_path)
                    scene_img = scene_img.convert('RGB')
                    max_width = VIDEO_WIDTH - 100
                    max_height = VIDEO_HEIGHT - 120
                    ratio = min(max_width / scene_img.width, max_height / scene_img.height)
                    new_width = int(scene_img.width * ratio)
                    new_height = int(scene_img.height * ratio)
                    scene_img = scene_img.resize((new_width, new_height))
                    x = (VIDEO_WIDTH - new_width) // 2
                    y = 90 + (max_height - new_height) // 2
                    img.paste(scene_img, (x, y))
                    logger.info(f"场景图片加载成功: {actual_image_path} (大小: {file_size} 字节)")
            except Exception as e:
                logger.error(f"加载场景图片失败: {e}, 路径: {actual_image_path}")
                import traceback
                logger.error(traceback.format_exc())
        else:
            logger.warning(f"场景图片文件不存在或不可读: {actual_image_path}")
    else:
        if scene_image_path:
            logger.warning(f"场景图片路径无法解析: {scene_image_path}")
        else:
            logger.info("没有提供场景图片")
    
    return np.array(img)

def get_audio_duration(audio_path):
    """获取音频时长"""
    if audio_path and os.path.exists(audio_path):
        try:
            audio = AudioFileClip(audio_path)
            duration = audio.duration
            audio.close()
            return duration
        except Exception as e:
            logger.error(f"获取音频时长失败: {e}, 路径: {audio_path}")
    return MIN_DURATION

def main(word_data: dict = {}, scene_image: str = "", 
         audio1: str = "", audio2: str = "", audio3: str = "", 
         audio4: str = "", audio5: str = "", audio6: str = "", audio7: str = ""):
    """
    生成带语音的单词学习视频，每页对应各自的语音
    """
    
    # Debug: 记录所有输入参数
    logger.info("=" * 80)
    logger.info("DEBUG: main 函数接收到的所有参数")
    logger.info(f"  word_data 类型: {type(word_data)}, 值: {word_data}")
    logger.info(f"  scene_image 类型: {type(scene_image)}, 值: {scene_image[:200] if isinstance(scene_image, str) else scene_image}")
    logger.info(f"  audio1 类型: {type(audio1)}, 值: {audio1[:200] if isinstance(audio1, str) else audio1}")
    logger.info(f"  audio2 类型: {type(audio2)}, 值: {audio2[:200] if isinstance(audio2, str) else audio2}")
    logger.info(f"  audio3 类型: {type(audio3)}, 值: {audio3[:200] if isinstance(audio3, str) else audio3}")
    logger.info(f"  audio4 类型: {type(audio4)}, 值: {audio4[:200] if isinstance(audio4, str) else audio4}")
    logger.info(f"  audio5 类型: {type(audio5)}, 值: {audio5[:200] if isinstance(audio5, str) else audio5}")
    logger.info(f"  audio6 类型: {type(audio6)}, 值: {audio6[:200] if isinstance(audio6, str) else audio6}")
    logger.info(f"  audio7 类型: {type(audio7)}, 值: {audio7[:200] if isinstance(audio7, str) else audio7}")
    logger.info("=" * 80)
    
    # Debug: 检查 word_data 是否为字典（仅记录，不修改）
    if not isinstance(word_data, dict):
        logger.error(f"ERROR: word_data 不是字典类型！实际类型: {type(word_data)}, 值: {word_data}")
    else:
        logger.info(f"DEBUG: word_data 是字典类型，包含键: {list(word_data.keys()) if word_data else '空字典'}")
    
    word = word_data.get("word", "") or ""
    phonetic = word_data.get("phonetic", "") or ""
    meaning = word_data.get("meaning", "") or ""
    example = word_data.get("example", "") or ""
    translation = word_data.get("translation", "") or ""
    tips = word_data.get("tips", "") or ""
    
    # Debug: 记录解析后的单词信息
    logger.info("DEBUG: 解析后的单词信息")
    logger.info(f"  word: {word}")
    logger.info(f"  phonetic: {phonetic}")
    logger.info(f"  meaning: {meaning}")
    logger.info(f"  example: {example}")
    logger.info(f"  translation: {translation}")
    logger.info(f"  tips: {tips}")
    
    output_path = OUTPUT_DIR + "/word_" + word + ".mp4"
    logger.info(f"开始生成视频: {output_path}")
    
    # Debug: 记录场景图片解析
    logger.info("DEBUG: 解析场景图片")
    logger.info(f"  原始 scene_image: {scene_image[:200] if isinstance(scene_image, str) else scene_image}")
    scene_image_path = extract_file_path(scene_image, wait_for_file=True, max_wait_seconds=10)
    logger.info(f"  解析后的 scene_image_path: {scene_image_path}")
    
    # 提取所有音频路径（不等待，因为音频应该已经生成）
    audio_paths = []
    logger.info("DEBUG: 开始提取音频路径")
    for i, audio_input in enumerate([audio1, audio2, audio3, audio4, audio5, audio6, audio7], 1):
        logger.info(f"  处理音频 {i}: 类型={type(audio_input)}, 值={audio_input[:200] if isinstance(audio_input, str) else audio_input}")
        audio_path = extract_file_path(audio_input, wait_for_file=False)
        if audio_path:
            logger.info(f"  音频 {i} 路径解析成功: {audio_path}")
            audio_paths.append(audio_path)
        else:
            logger.warning(f"  音频 {i} 未找到或解析失败: {audio_input}")
            audio_paths.append(None)
    logger.info(f"DEBUG: 音频路径提取完成，共 {len([p for p in audio_paths if p])} 个有效路径")
    
    # 定义每页的图片和对应的音频
    example_translation_audio = None
    if audio_paths[2] and audio_paths[3]:
        # 两个音频都存在，合并它们
        example_translation_audio = merge_audio_files(
            audio_paths[2], 
            audio_paths[3], 
            OUTPUT_DIR + "/example_translation_" + word + ".mp3"
        )
    else:
        # 只使用存在的那个
        example_translation_audio = audio_paths[2] or audio_paths[3]
    # 定义每页的图片和对应的音频
    slides_data = [
        (
            create_text_image([
                (word, 80, ACCENT_COLOR, 250),
                (phonetic, 40, TEXT_COLOR, 380),
            ], title="单词学习"),
            audio_paths[0]
        ),
        (
            create_text_image([
                (word, 60, ACCENT_COLOR, 180),
                ("中文释义", 30, (150, 150, 150), 280),
                (meaning, 50, TEXT_COLOR, 350),
            ], title="释义", corner_word=word),
            audio_paths[1]
        ),
        (
            # 例句+翻译合并页
            create_text_image([
                ("例句", 32, (150, 150, 150), 200),
                (example[:45] + ("..." if len(example) > 45 else ""), 28, TEXT_COLOR, 250),
                (example[45:90] if len(example) > 45 else "", 28, TEXT_COLOR, 290),
                ("翻译", 32, (150, 150, 150), 360),
                (translation[:45] + ("..." if len(translation) > 45 else ""), 28, TEXT_COLOR, 410),
                (translation[45:90] if len(translation) > 45 else "", 28, TEXT_COLOR, 450),
            ], title="例句与翻译", corner_word=word),
            example_translation_audio  # 使用合并后的音频
        ),
        (
            create_text_image([
                ("记忆技巧", 40, ACCENT_COLOR, 200),
                (tips[:35] if len(tips) <= 35 else tips[:35], 32, TEXT_COLOR, 320),
                (tips[35:70] if len(tips) > 35 else "", 32, TEXT_COLOR, 370),
                (tips[70:105] if len(tips) > 70 else "", 32, TEXT_COLOR, 420),
            ], title="记忆", corner_word=word),
            audio_paths[4]
        ),
        (
            create_scene_image(scene_image_path, title="记忆场景", corner_word=word),
            audio_paths[5]
        ),
        (
            create_text_image([
                (word, 60, ACCENT_COLOR, 180),
                (phonetic, 30, (180, 180, 180), 260),
                (meaning, 36, TEXT_COLOR, 340),
                ("加油学习", 28, (255, 200, 100), 480),
            ], title="复习总结", corner_word=word),
            audio_paths[6]
        ),
    ]
    
    clips = []
    
    for idx, (image, audio_path) in enumerate(slides_data, 1):
        # 获取音频时长
        audio_duration = get_audio_duration(audio_path) if audio_path else MIN_DURATION
        clip_duration = max(MIN_DURATION, audio_duration + EXTRA_PAUSE)
        
        # 创建视频片段
        video_clip = ImageClip(image).with_duration(clip_duration)
        
        # 添加音频
        if audio_path and os.path.exists(audio_path):
            try:
                logger.info(f"为片段 {idx} 添加音频: {audio_path}")
                audio_clip = AudioFileClip(audio_path)
                video_clip = video_clip.with_audio(audio_clip)
                logger.info(f"片段 {idx} 音频添加成功，时长: {audio_clip.duration}秒")
            except Exception as e:
                logger.error(f"片段 {idx} 添加音频失败: {e}, 路径: {audio_path}")
        else:
            if audio_path:
                logger.warning(f"片段 {idx} 音频文件不存在: {audio_path}")
            else:
                logger.info(f"片段 {idx} 没有音频")
        
        clips.append(video_clip)
    
    # 合并所有片段
    logger.info(f"开始合并 {len(clips)} 个视频片段")
    final_video = concatenate_videoclips(clips, method="compose")
    
    # 检查最终视频是否有音频
    has_audio = final_video.audio is not None
    logger.info(f"最终视频是否有音频: {has_audio}")
    
    if not has_audio:
        logger.warning("警告：最终视频没有音频！可能的原因：")
        logger.warning("1. TTS API 速率限制导致音频生成失败")
        logger.warning("2. 音频文件路径解析失败")
        logger.warning("3. 音频文件不存在或无法读取")
        logger.warning("视频仍会生成，但没有声音")
    
    # 写入视频文件
    logger.info(f"开始写入视频文件: {output_path}")
    # 注意：如果视频没有音频，不指定 audio_codec
    if has_audio:
        final_video.write_videofile(
            output_path, 
            fps=FPS, 
            codec='libx264', 
            audio_codec='aac'
        )
    else:
        final_video.write_videofile(
            output_path, 
            fps=FPS, 
            codec='libx264'
        )
    
    # 清理资源
    final_video.close()
    for clip in clips:
        if clip.audio:
            clip.audio.close()
        clip.close()
    
    logger.info(f"视频生成完成: {output_path}")
    return output_path