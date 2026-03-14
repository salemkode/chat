// @ts-nocheck
import { getMemorySearchManager } from '../memory/index.js'

async function test() {
  console.log('🧪 Testing Convex Memory Backend...\n')

  const options = {
    cfg: { agents: { defaults: {} } },
    agentId: 'test-agent',
  } satisfies Parameters<typeof getMemorySearchManager>[0]

  const { manager, error } = await getMemorySearchManager(options)

  if (error || !manager) {
    console.error('❌ Failed to create manager:', error)
    process.exit(1)
  }

  console.log('✅ Manager created successfully\n')

  try {
    console.log('📊 Getting status...')
    const status = await manager.status()
    console.log('Status:', JSON.stringify(status, null, 2))
    console.log()

    console.log('🔄 Syncing files...')
    await manager.sync()
    console.log('✅ Sync complete\n')

    const finalStatus = await manager.status()
    console.log('Final status:', JSON.stringify(finalStatus, null, 2))
    console.log()

    console.log('🔍 Searching for test query...')
    const results = await manager.search('test query', {
      maxResults: 5,
    })

    console.log(`✅ Found ${results.length} results:`)
    for (const result of results) {
      console.log(
        `  - ${result.path}:${result.startLine}-${result.endLine} (score: ${result.score.toFixed(2)})`,
      )
      console.log(`    ${result.snippet.slice(0, 80)}...`)
    }

    console.log()
    await manager.close()
    console.log('✅ All tests passed!')
  } catch (err) {
    console.error('❌ Test failed:', err)
    process.exit(1)
  }
}

test().catch(console.error)
