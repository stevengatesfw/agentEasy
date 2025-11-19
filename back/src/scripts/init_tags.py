# Copyright (c) 2025 SenseTime. All Rights Reserved.
# Author: LazyLLM Team,  https://github.com/LazyAGI/LazyLLM
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# DATA 定义放在导入之前，避免循环导入问题
DATA = {
    "app": "办公、生活、教育、娱乐、其他",
    "knowledgebase": "技术、产品、财务、生活、法律、其他",
    "prompt": "代码助手、角色扮演、通用结构、技能调用、知识库问答、平台内置",
    "model": "长文本、Text2SQL、文本评估、通用、分类、代码、其他",
    "tool": "文件、数据、网络、图像、其他",
    "mcp": "数据、服务、消息、文件、身份、其他",
    "dataset": "文本问答、文本分类、Text2SQL、文本生成、翻译、数学、代码、其他"
}


def main():
    """主函数，初始化所有预定义的标签数据。

    遍历 DATA 字典中的所有标签类型和标签名称，检查数据库中是否已存在相应标签。
    如果不存在则创建新标签，如果已存在则更新其租户ID为管理员ID。

    标签将被分配给系统管理员账户。
    """
    # 延迟导入，避免循环导入问题
    from app import app
    from models.model_account import Account
    from parts.tag.model import Tag
    from utils.util_database import db
    
    with app.app_context():
        for _type, line in DATA.items():
            for name in [k.strip() for k in line.split("、") if k.strip()]:
                tag = Tag.query.filter_by(type=_type, name=name).first()
                if not tag:
                    tag = Tag(type=_type, name=name)
                    tag.tenant_id = Account.get_administrator_id()
                    db.session.add(tag)
                    db.session.commit()
                else:
                    tag.tenant_id = Account.get_administrator_id()
                    db.session.commit()

                print(f"create {_type} {name}")


if __name__ == "__main__":
    main()
