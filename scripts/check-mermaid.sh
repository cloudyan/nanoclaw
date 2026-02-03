#!/bin/bash
# Mermaid 语法检查脚本
# 检查 Markdown 文件中的 Mermaid 图表语法

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查单个文件
function check_file() {
    local file="$1"
    local errors=0
    
    echo "检查文件: $file"
    
    # 提取 Mermaid 代码块
    local mermaid_blocks=$(grep -A 1000 '```mermaid' "$file" | grep -B 1000 '```' | head -n -1 | tail -n +2)
    
    # 检查错误模式 1: 未加引号的节点定义中的 <br/>
    if grep -q '\[.*<br\/>.*\]' "$file"; then
        # 检查是否有未加引号的 <br/>
        local unquoted_br=$(grep -n '\[.*<br\/>.*\]' "$file" | grep -v '".*<br\/>.*"' || true)
        if [ -n "$unquoted_br" ]; then
            echo -e "${RED}✗ 发现未加引号的 <br/> 在节点定义中:${NC}"
            echo "$unquoted_br"
            ((errors++))
        fi
    fi
    
    # 检查错误模式 2: Sequence participant 中的 <br/>
    if grep -q 'participant.*<br\/>' "$file"; then
        echo -e "${RED}✗ 发现 participant 定义中包含 <br/>:${NC}"
        grep -n 'participant.*<br\/>' "$file"
        ((errors++))
    fi
    
    # 检查错误模式 3: 决策节点中的 <br/>
    if grep -q '{.*<br\/>.*}' "$file"; then
        local unquoted_diamond=$(grep -n '{.*<br\/>.*}' "$file" | grep -v '".*<br\/>.*"' || true)
        if [ -n "$unquoted_diamond" ]; then
            echo -e "${RED}✗ 发现未加引号的 <br/> 在决策节点中:${NC}"
            echo "$unquoted_diamond"
            ((errors++))
        fi
    fi
    
    if [ $errors -eq 0 ]; then
        echo -e "${GREEN}✓ 通过${NC}"
        return 0
    else
        echo -e "${RED}✗ 发现 $errors 处错误${NC}"
        return 1
    fi
}

# 检查目录中的所有 Markdown 文件
function check_directory() {
    local dir="$1"
    local total_errors=0
    local total_files=0
    
    echo "检查目录: $dir"
    echo ""
    
    for file in "$dir"/*.md; do
        if [ -f "$file" ]; then
            ((total_files++))
            if ! check_file "$file"; then
                ((total_errors++))
            fi
            echo ""
        fi
    done
    
    echo "================================"
    echo "检查完成: $total_files 个文件"
    if [ $total_errors -eq 0 ]; then
        echo -e "${GREEN}✓ 所有文件通过检查${NC}"
        return 0
    else
        echo -e "${RED}✗ $total_errors 个文件包含错误${NC}"
        return 1
    fi
}

# 主函数
function main() {
    if [ $# -eq 0 ]; then
        echo "用法: $0 <file.md|directory/>"
        echo ""
        echo "示例:"
        echo "  $0 analysis/附录-架构图集.md    # 检查单个文件"
        echo "  $0 analysis/                     # 检查整个目录"
        exit 1
    fi
    
    local target="$1"
    
    if [ -f "$target" ]; then
        check_file "$target"
        exit $?
    elif [ -d "$target" ]; then
        check_directory "$target"
        exit $?
    else
        echo -e "${RED}错误: 路径不存在: $target${NC}"
        exit 1
    fi
}

main "$@"
