#!/usr/bin/env node

/**
 * Claude Auto-Implementation Script (v2 - Tool Use)
 *
 * This script gives Claude actual tools (read/write files, run commands)
 * instead of forcing a custom text format. Claude can work iteratively.
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

// Tool definitions
const tools = [
  {
    name: 'read_file',
    description: 'Read the contents of a file. Returns the full file content.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The file path to read (e.g., "src/hello.py")'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Write content to a file. Creates the file and any necessary directories. Overwrites if file exists.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The file path to write to (e.g., "src/hello.py")'
        },
        content: {
          type: 'string',
          description: 'The full content to write to the file'
        }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'list_files',
    description: 'List files in a directory matching a pattern. Uses glob patterns.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Glob pattern (e.g., "**/*.py", "src/**/*.js", "*.md")'
        }
      },
      required: ['pattern']
    }
  },
  {
    name: 'run_command',
    description: 'Run a shell command and return the output. Use for running tests, linters, etc.',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to run (e.g., "python -m pytest", "go test ./...")'
        }
      },
      required: ['command']
    }
  },
  {
    name: 'finish',
    description: 'Call this when you have completed the implementation and all tests pass.',
    input_schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'A brief summary of what was implemented'
        }
      },
      required: ['summary']
    }
  }
];

// Tool execution handlers
async function executeTool(toolName, toolInput) {
  console.log(`🔧 Executing tool: ${toolName}`);

  try {
    switch (toolName) {
      case 'read_file':
        const content = await fs.readFile(toolInput.path, 'utf-8');
        console.log(`  ✓ Read ${toolInput.path}`);
        return content;

      case 'write_file':
        const dir = path.dirname(toolInput.path);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(toolInput.path, toolInput.content, 'utf-8');
        console.log(`  ✓ Wrote ${toolInput.path}`);
        return `Successfully wrote ${toolInput.path}`;

      case 'list_files':
        const { execSync } = require('child_process');
        const files = execSync(`find . -path "${toolInput.pattern}" ! -path "./node_modules/*" ! -path "./.git/*" | head -50`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore']
        }).trim();
        console.log(`  ✓ Listed files matching ${toolInput.pattern}`);
        return files || 'No files found';

      case 'run_command':
        try {
          const output = execSync(toolInput.command, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
            maxBuffer: 10 * 1024 * 1024
          });
          console.log(`  ✓ Command succeeded`);
          return output;
        } catch (error) {
          const exitCode = error.status || error.code || 'unknown';
          console.log(`  ⚠️ Command failed (exit code ${exitCode})`);
          return `Command failed with exit code ${exitCode}\n\nStdout:\n${error.stdout || ''}\n\nStderr:\n${error.stderr || error.message}`;
        }

      case 'finish':
        console.log(`  ✓ Implementation complete: ${toolInput.summary}`);
        return toolInput.summary;

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    console.error(`  ✗ Tool execution failed: ${error.message}`);
    return `Error: ${error.message}`;
  }
}

async function readProjectContext() {
  console.log('📖 Reading project context...');

  let context = '';

  try {
    const claudeMd = await fs.readFile('.claude/CLAUDE.md', 'utf-8');
    context += `# Project Instructions\n${claudeMd}\n\n`;
  } catch (error) {
    // No project instructions
  }

  try {
    const readme = await fs.readFile('README.md', 'utf-8');
    context += `# README\n${readme.substring(0, 2000)}\n\n`;
  } catch (error) {
    // No README
  }

  return context || 'No project documentation found. Infer best practices from the issue description.';
}

async function runClaudeWithTools() {
  console.log('🤖 Starting Claude with tool access...');

  const projectContext = await readProjectContext();

  const systemPrompt = `You are an expert software developer implementing features from GitHub issues.

${projectContext}

# Your Task
Implement the feature described in the GitHub issue below. You have access to tools to:
- Read files to understand the codebase
- Write files to implement features
- List files to explore the project structure
- Run commands to test your implementation

# Guidelines
1. Start by exploring the codebase structure with list_files
2. Read relevant files to understand existing patterns (if any exist)
3. Implement the feature following the project's conventions
4. Write tests for your implementation
5. Try to run tests if possible, but don't get stuck if tools aren't installed
6. **Call finish() once files are created** - the CI will run tests separately

**Important:** This runs in a CI environment that may not have all tools installed yet (Python, Node, etc).
If run_command fails, it's okay - just create the files and call finish(). The GitHub Actions workflow will handle testing.

Work efficiently - you have a 30-turn limit. Focus on creating quality code rather than testing it yourself.`;

  const messages = [
    {
      role: 'user',
      content: `# GitHub Issue #${ISSUE_NUMBER}

**Title:** ${ISSUE_TITLE}

**Description:**
${ISSUE_BODY}

---

Please implement this feature. Use the available tools to explore the codebase, write code, and test your implementation.`
    }
  ];

  let finished = false;
  let turnCount = 0;
  const MAX_TURNS = 30; // Prevent infinite loops

  while (!finished && turnCount < MAX_TURNS) {
    turnCount++;
    console.log(`\n--- Turn ${turnCount} ---`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      system: systemPrompt,
      tools: tools,
      messages: messages
    });

    console.log(`Claude's response: ${response.stop_reason}`);

    // Add assistant's response to messages
    messages.push({
      role: 'assistant',
      content: response.content
    });

    // Process tool uses
    if (response.stop_reason === 'tool_use') {
      const toolResults = [];

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          console.log(`\n📋 Claude wants to use: ${block.name}`);

          if (block.name === 'finish') {
            finished = true;
            console.log(`\n✨ ${block.input.summary}`);
          }

          const result = await executeTool(block.name, block.input);

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: String(result)
          });
        } else if (block.type === 'text') {
          console.log(`💬 Claude says: ${block.text.substring(0, 200)}${block.text.length > 200 ? '...' : ''}`);
        }
      }

      // Add tool results to messages
      if (toolResults.length > 0) {
        messages.push({
          role: 'user',
          content: toolResults
        });
      }
    } else if (response.stop_reason === 'end_turn') {
      // Claude stopped without calling tools
      console.log('Claude completed without calling more tools');
      break;
    } else {
      console.log(`Unexpected stop reason: ${response.stop_reason}`);
      break;
    }
  }

  if (turnCount >= MAX_TURNS) {
    console.warn('⚠️  Reached maximum turn limit');
  }

  return finished;
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
    execSync('git add .');

    const commitMessage = `feat: ${ISSUE_TITLE}\n\nImplemented by Claude (Issue #${ISSUE_NUMBER})`;
    execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);

    console.log('✅ Changes committed');
    return true;
  } catch (error) {
    if (error.message.includes('nothing to commit')) {
      console.log('⚠️  No changes to commit');
      return false;
    }
    console.error('⚠️  Commit warning:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Claude Auto-Implementation (v2 - Tool Use)');
  console.log(`📋 Issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}`);
  console.log('');

  try {
    const success = await runClaudeWithTools();

    if (!success) {
      console.error('❌ Implementation did not complete successfully');
      process.exit(1);
    }

    configureGit();
    const hasChanges = commitChanges();

    if (!hasChanges) {
      console.error('❌ No changes were made');
      process.exit(1);
    }

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
