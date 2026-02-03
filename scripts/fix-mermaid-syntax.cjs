#!/usr/bin/env node
/**
 * Mermaid 语法修复脚本
 *
 * 修复规则：
 * 1. Flowchart节点定义中的<br/> → 在引号内
 *    ID[Line1<br/>Line2] → ID["Line1<br/>Line2"]
 * 2. Sequence Diagram participant中的<br/> → 移除多行
 *    participant A as Name<br/>(detail) → participant A as Name (detail)
 * 3. 决策节点中的<br/> → 在引号内
 *    ID{Decision<br/>Text} → ID["Decision<br/>Text"]
 */

const fs = require('fs');
const path = require('path');

// 定义要修复的文件列表
const filesToFix = [
  'analysis/附录-架构图集.md',
  'analysis/10-整体架构与数据流.md',
  'analysis/15-安全模型实现细节.md',
  'analysis/30-安全设计深度解析.md',
  'analysis/13-调度系统详解.md',
  'analysis/03-核心概念入门.md',
  'analysis/14-IPC机制深度解析.md',
  'analysis/00-项目概览与哲学.md',
];

// 提取Mermaid代码块并修复的函数
function fixMermaidInFile(content) {
  let fixedContent = content;
  let totalFixes = 0;

  // 提取所有Mermaid代码块
  const mermaidRegex = /```mermaid([\s\S]*?)```/g;
  let match;
  const fixesList = [];

  while ((match = mermaidRegex.exec(content)) !== null) {
    const originalBlock = match[0];
    let fixedBlock = originalBlock;
    let blockFixes = 0;

    // 规则1: Flowchart节点 - ID[Text<br/>Line] → ID["Text<br/>Line"]
    // 匹配未加引号的节点定义
    const nodeRegex = /(\w+)\[([^\[\]]*<br\/>[^\[\]]*)\]/g;
    const beforeRule1 = fixedBlock;
    fixedBlock = fixedBlock.replace(nodeRegex, (m, id, text) => {
      // 如果text中没有引号，添加引号
      if (!text.startsWith('"') && !text.startsWith("'")) {
        return `${id}["${text}"]`;
      }
      return m;
    });
    blockFixes += (beforeRule1.match(nodeRegex) || []).length;

    // 规则2: Sequence participant - participant A as Text<br/>(detail) → participant A as Text (detail)
    const participantRegex = /(participant\s+\w+\s+as\s+[^<\n]+)<br\/>/g;
    const beforeRule2 = fixedBlock;
    fixedBlock = fixedBlock.replace(participantRegex, '$1 ');
    blockFixes += (beforeRule2.match(participantRegex) || []).length;

    // 规则3: 决策节点 - ID{Decision<br/>Text} → ID["Decision<br/>Text"]
    const diamondRegex = /(\w+)\{([^\{\}]*<br\/>[^\{\}]*)\}/g;
    const beforeRule3 = fixedBlock;
    fixedBlock = fixedBlock.replace(diamondRegex, (m, id, text) => {
      if (!text.startsWith('"') && !text.startsWith("'")) {
        return `${id}["${text}"]`;
      }
      return m;
    });
    blockFixes += (beforeRule3.match(diamondRegex) || []).length;

    // 规则4: Sequence消息 - A->>B: Line1<br/>Line2 → A->>B: Line1\nLine2
    const arrowNoteRegex = /(\w+(->>|--|\.\.>|-->)\w+:\s*)([^<\n]*)(<br\/>)/g;
    const beforeRule4 = fixedBlock;
    fixedBlock = fixedBlock.replace(arrowNoteRegex, '$1$3\n');
    blockFixes += (beforeRule4.match(arrowNoteRegex) || []).length;

    if (blockFixes > 0) {
      fixedContent = fixedContent.replace(originalBlock, fixedBlock);
      totalFixes += blockFixes;
      fixesList.push({ fixes: blockFixes });
    }
  }

  return { content: fixedContent, fixes: totalFixes };
}

function processFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠ 文件不存在，跳过: ${filePath}`);
    return { success: false, fixes: 0, error: 'File not found' };
  }

  const originalContent = fs.readFileSync(fullPath, 'utf8');
  const { content: fixedContent, fixes } = fixMermaidInFile(originalContent);

  if (fixes === 0) {
    console.log(`  ℹ 无需要修复的问题: ${filePath}`);
    return { success: true, fixes: 0 };
  }

  // 创建备份文件
  const backupPath = `${fullPath}.backup`;
  fs.writeFileSync(backupPath, originalContent, 'utf8');
  console.log(`  ✓ 创建备份: ${backupPath}`);

  // 写入修复后的内容
  fs.writeFileSync(fullPath, fixedContent, 'utf8');
  console.log(`  ✓ 修复完成: ${filePath} (${fixes} 处)`);

  return { success: true, fixes };
}

function main() {
  console.log('='.repeat(60));
  console.log('Mermaid 语法修复脚本');
  console.log('='.repeat(60));

  let totalFilesFixed = 0;
  let totalFixes = 0;

  filesToFix.forEach(filePath => {
    const result = processFile(filePath);
    if (result.success && result.fixes > 0) {
      totalFilesFixed++;
      totalFixes += result.fixes;
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('修复汇总');
  console.log('='.repeat(60));
  console.log(`处理的文件数: ${totalFilesFixed}`);
  console.log(`修复的错误数: ${totalFixes}`);
  console.log('='.repeat(60));

  if (totalFixes > 0) {
    console.log('\n✓ 修复完成！');
    console.log('  备份文件已创建，可以使用 .backup 后缀的文件回滚');
    console.log('  运行以下命令验证修复:');
    console.log('    grep -r \'participant.*<br/>\' analysis/*.md');
    console.log('    grep -r \'\\[[^"]*<br\/>[^"]*\\]\' analysis/*.md');
  } else {
    console.log('\nℹ 未发现需要修复的问题');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixMermaidInFile, processFile };
