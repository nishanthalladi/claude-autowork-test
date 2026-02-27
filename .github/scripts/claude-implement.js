#!/usr/bin/env node

/**
 * Claude Auto-Implementation Script
 *
 * This script uses Claude API to automatically implement features based on GitHub issues.
 * It reads issue details, sends them to Claude, and applies the suggested changes.
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ISSUE_NUMBER = process.env.ISSUE_NUMBER;
const ISSUE_TITLE = process.env.ISSUE_TITLE;
const ISSUE_BODY = process.env.ISSUE_BODY || '';

// Validate environment
if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY is not set');
  process.exit(1);
}

if (!ISSUE_NUMBER || !ISSUE_TITLE) {
  console.error('❌ Issue information is missing');
  process.exit(1);
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

async function readProjectContext() {
  console.log('📖 Reading project context...');

  try {
    const claudeMd = await fs.readFile('.claude/CLAUDE.md', 'utf-8');
    const systemDescription = await fs.readFile('docs/lincare-system-description.md', 'utf-8');
    const codingGuidelines = await fs.readFile('docs/CODING_GUIDELINES.md', 'utf-8');

    return {
      claudeMd,
      systemDescription,
      codingGuidelines
    };
  } catch (error) {
    console.error('⚠️  Could not read some project documentation:', error.message);
    return {};
  }
}

async function getRelevantFiles() {
  console.log('🔍 Scanning for relevant files...');

  try {
    // Get Go files, excluding vendor and test files for context
    const output = execSync('find . -name "*.go" ! -path "./vendor/*" ! -name "*_test.go" | head -20', {
      encoding: 'utf-8'
    });

    return output.trim().split('\n').filter(f => f);
  } catch (error) {
    console.error('⚠️  Could not scan files:', error.message);
    return [];
  }
}

async function callClaude(issueContext, projectContext) {
  console.log('🤖 Calling Claude API...');

  const systemPrompt = `You are an expert software developer implementing features for this project.

${projectContext.claudeMd ? `# Project Context\n${projectContext.claudeMd}\n` : ''}
${projectContext.systemDescription ? `# System Description\n${projectContext.systemDescription.substring(0, 5000)}\n` : ''}
${projectContext.codingGuidelines ? `# Coding Guidelines\n${projectContext.codingGuidelines.substring(0, 3000)}\n` : ''}

# Your Task
Implement the feature described in the GitHub issue below. Follow best practices for the language and framework being used.

${projectContext.claudeMd || projectContext.codingGuidelines ? 'Follow the project guidelines above.' : 'Write clean, tested, well-structured code.'}

# Output Format
Provide your implementation as a series of file operations in this format:

---FILE: path/to/file.ext
\`\`\`language
// Full file content here
\`\`\`

---FILE: path/to/test_file.ext
\`\`\`language
// Full test file content here
\`\`\`

Make sure to include complete, working code that can be directly written to files.`;

  const userPrompt = `# GitHub Issue #${ISSUE_NUMBER}

**Title:** ${ISSUE_TITLE}

**Description:**
${ISSUE_BODY}

---

Please implement this feature following the project's clean architecture principles. Provide complete, working code for all necessary files.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    const content = response.content[0].text;
    console.log('✅ Received response from Claude');
    return content;
  } catch (error) {
    console.error('❌ Claude API error:', error.message);
    throw error;
  }
}

function parseFileOperations(claudeResponse) {
  console.log('📝 Parsing file operations...');

  const fileOperations = [];
  const fileRegex = /---FILE:\s*(.+?)\n```(?:go|golang)?\n([\s\S]+?)```/g;

  let match;
  while ((match = fileRegex.exec(claudeResponse)) !== null) {
    const filePath = match[1].trim();
    const content = match[2];

    fileOperations.push({
      path: filePath,
      content: content
    });
  }

  console.log(`✅ Found ${fileOperations.length} file operations`);
  return fileOperations;
}

async function applyFileOperations(operations) {
  console.log('💾 Applying file changes...');

  for (const op of operations) {
    try {
      // Ensure directory exists
      const dir = path.dirname(op.path);
      await fs.mkdir(dir, { recursive: true });

      // Write file
      await fs.writeFile(op.path, op.content, 'utf-8');
      console.log(`  ✓ ${op.path}`);
    } catch (error) {
      console.error(`  ✗ Failed to write ${op.path}:`, error.message);
      throw error;
    }
  }

  console.log('✅ All files written successfully');
}

function configureGit() {
  console.log('🔧 Configuring git...');

  try {
    execSync('git config user.name "Claude Bot"');
    execSync('git config user.email "claude-bot@anthropic.com"');
    console.log('✅ Git configured');
  } catch (error) {
    console.error('⚠️  Git configuration warning:', error.message);
  }
}

function commitChanges() {
  console.log('📦 Committing changes...');

  try {
    // Stage all changes
    execSync('git add .');

    // Commit
    const commitMessage = `feat: ${ISSUE_TITLE}\n\nImplemented by Claude (Issue #${ISSUE_NUMBER})`;
    execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);

    console.log('✅ Changes committed');
  } catch (error) {
    console.error('⚠️  Commit warning:', error.message);
    // Continue even if commit fails (might be no changes)
  }
}

async function main() {
  console.log('🚀 Starting Claude Auto-Implementation');
  console.log(`📋 Issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}`);
  console.log('');

  try {
    // Read project context
    const projectContext = await readProjectContext();

    // Get relevant files for context
    await getRelevantFiles();

    // Call Claude
    const claudeResponse = await callClaude({
      number: ISSUE_NUMBER,
      title: ISSUE_TITLE,
      body: ISSUE_BODY
    }, projectContext);

    // Parse and apply changes
    const operations = parseFileOperations(claudeResponse);

    if (operations.length === 0) {
      console.error('❌ No file operations found in Claude response');
      console.log('Claude response:', claudeResponse.substring(0, 500));
      process.exit(1);
    }

    await applyFileOperations(operations);

    // Configure git and commit
    configureGit();
    commitChanges();

    console.log('');
    console.log('✨ Implementation complete!');
    console.log('');

  } catch (error) {
    console.error('❌ Implementation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
main();
