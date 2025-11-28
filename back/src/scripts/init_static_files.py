import os
import shutil


def main():
    """主函数，复制静态文件到指定目录。

    从环境变量读取上传基础路径和默认图标路径，然后将源目录中的文件
    复制到目标位置。对于 .jpg 文件，会额外复制一份到默认图标目录。

    Environment Variables:
        UPLOAD_BASE_PATH: 上传文件的基础路径，默认为 "/app/upload"
        DEFAULT_ICON_PATH: 默认图标文件路径，默认为 "/app/upload/default_icon"
    """
    # 从环境变量获取路径配置
    UPLOAD_BASE_PATH = os.environ.get("UPLOAD_BASE_PATH", "/app/upload")
    DEFAULT_ICON_PATH = os.environ.get("DEFAULT_ICON_PATH", "/app/upload/default_icon")
    this_dir = os.path.dirname(os.path.abspath(__file__))
    source_dir = os.path.join(this_dir, "nginx-init-static")

    if not os.path.isdir(source_dir):
        return  # 找不到目录

    for name in os.listdir(source_dir):
        if name[0] in [".", "~"]:
            continue  # 忽略隐藏文件

        source = os.path.join(source_dir, name)
        target = os.path.join(UPLOAD_BASE_PATH, name)

        if os.path.isfile(source):
            print(f"copy file {source} to {target}")
            shutil.copyfile(source, target)
            if ".jpg" in source:
                target = os.path.join(DEFAULT_ICON_PATH, name)
                print(f"copy file {source} to default_icon")
                os.makedirs(os.path.dirname(target), exist_ok=True)
                shutil.copyfile(source, target)

        elif os.path.isdir(source):
            print(f"copy tree {source} to {target}")
            shutil.copytree(source, target, dirs_exist_ok=True)


if __name__ == "__main__":
    main()
