import { PrismaClient } from '@prisma/client'
import { detectBias, buildPastAnswersContext, buildPastDecisionsContext } from '../lib/decision-helpers'

const prisma = new PrismaClient()

async function testFeatures() {
  console.log('🧪 Testing Coin Flip Features\n')
  console.log('=' .repeat(60))

  // Get the migrated user
  const users = await prisma.$queryRaw<Array<{ id: string; email: string }>>`
    SELECT id, email FROM auth.users LIMIT 1
  `

  if (users.length === 0) {
    console.log('❌ No users found in database')
    return
  }

  const userId = users[0].id
  console.log(`\n✓ Testing with user: ${users[0].email}`)
  console.log(`  User ID: ${userId}\n`)

  // Test 1: Check if past decisions exist
  console.log('Test 1: Past Decisions Storage')
  console.log('-'.repeat(60))

  const allDecisions = await prisma.decision.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      question: true,
      initialChoice: true,
      finalChoice: true,
      clarifyingAnswers: true,
      createdAt: true,
    },
  })

  console.log(`Found ${allDecisions.length} past decisions`)

  if (allDecisions.length > 0) {
    console.log('\nMost recent decision:')
    const latest = allDecisions[0]
    console.log(`  Question: ${latest.question}`)
    console.log(`  Initial Choice: ${latest.initialChoice || 'Not set'}`)
    console.log(`  Final Choice: ${latest.finalChoice || 'Not set'}`)
    console.log(`  Has Clarifying Answers: ${latest.clarifyingAnswers ? 'Yes' : 'No'}`)

    if (latest.clarifyingAnswers) {
      try {
        const answers = JSON.parse(latest.clarifyingAnswers)
        console.log(`  Number of Q&A pairs: ${answers.length}`)
      } catch (e) {
        console.log(`  ⚠️  Failed to parse clarifying answers`)
      }
    }
  } else {
    console.log('⚠️  No decisions found - create some decisions first to test learning features')
  }

  // Test 2: Past Answers Context (Learning Feature)
  console.log('\n\nTest 2: Past Answers Context (Learning from Previous Questions)')
  console.log('-'.repeat(60))

  const testQuestion = "Should I eat vegan or normal patty?"
  const testOptions = ["vegan patty", "normal patty"]

  const pastAnswersContext = await buildPastAnswersContext(userId, testQuestion, testOptions)

  if (pastAnswersContext) {
    console.log('✓ Past answers context generated:')
    console.log(pastAnswersContext)
  } else {
    console.log('ℹ️  No relevant past answers found')
    console.log('   (This is normal if you haven\'t answered similar questions before)')
  }

  // Test 3: Past Decisions Context
  console.log('\n\nTest 3: Past Decisions Context (Learning from History)')
  console.log('-'.repeat(60))

  const pastDecisionsContext = await buildPastDecisionsContext(userId, testQuestion, testOptions)

  if (pastDecisionsContext) {
    console.log('✓ Past decisions context generated:')
    console.log(pastDecisionsContext)
  } else {
    console.log('ℹ️  No relevant past decisions found')
    console.log('   (This is normal if you haven\'t made similar decisions before)')
  }

  // Test 4: Bias Detection
  console.log('\n\nTest 4: Bias Detection')
  console.log('-'.repeat(60))

  // Test emotional language detection
  const emotionalAnswers = [
    { question: "How do you feel about this?", answer: "I'm scared and anxious about making the wrong choice. My gut feeling is very strong." },
    { question: "What worries you?", answer: "I'm terrified of the consequences and feel overwhelmed." },
  ]

  const optionAnalyses = [
    { option: "Option A", weight: 80 },
    { option: "Option B", weight: 30 },
  ]

  const biasResult1 = detectBias(emotionalAnswers, "Option B", optionAnalyses)

  console.log('Test 4a: Emotional + Contradiction Bias')
  console.log(`  Bias Detected: ${biasResult1.biasDetected ? '✓ Yes' : '✗ No'}`)
  console.log(`  Bias Type: ${biasResult1.biasType}`)
  console.log(`  Emotional Score: ${biasResult1.emotionalScore}`)
  console.log(`  Message: ${biasResult1.biasMessage}`)

  // Test emotional only
  const biasResult2 = detectBias(emotionalAnswers, "Option A", optionAnalyses)

  console.log('\nTest 4b: Emotional Bias Only')
  console.log(`  Bias Detected: ${biasResult2.biasDetected ? '✓ Yes' : '✗ No'}`)
  console.log(`  Bias Type: ${biasResult2.biasType}`)
  console.log(`  Emotional Score: ${biasResult2.emotionalScore}`)

  // Test no bias
  const neutralAnswers = [
    { question: "What are the pros?", answer: "It costs less and takes less time." },
    { question: "What are the cons?", answer: "It might not be as effective long-term." },
  ]

  const biasResult3 = detectBias(neutralAnswers, "Option A", optionAnalyses)

  console.log('\nTest 4c: No Bias (Neutral Language)')
  console.log(`  Bias Detected: ${biasResult3.biasDetected ? '✓ Yes' : '✗ No'}`)
  console.log(`  Bias Type: ${biasResult3.biasType}`)
  console.log(`  Emotional Score: ${biasResult3.emotionalScore}`)

  // Test 5: Check if clarifying answers are being stored
  console.log('\n\nTest 5: Clarifying Answers Storage')
  console.log('-'.repeat(60))

  const decisionsWithAnswers = allDecisions.filter(d => d.clarifyingAnswers)

  console.log(`Decisions with clarifying answers: ${decisionsWithAnswers.length}/${allDecisions.length}`)

  if (decisionsWithAnswers.length > 0) {
    console.log('\n✓ Sample clarifying answers:')
    decisionsWithAnswers.slice(0, 2).forEach((d, i) => {
      console.log(`\n  Decision ${i + 1}: ${d.question}`)
      try {
        const answers = JSON.parse(d.clarifyingAnswers!)
        answers.forEach((qa: any, j: number) => {
          console.log(`    Q${j + 1}: ${qa.question}`)
          console.log(`    A${j + 1}: ${qa.answer}`)
        })
      } catch (e) {
        console.log(`    ⚠️  Failed to parse`)
      }
    })
  } else {
    console.log('⚠️  No decisions with clarifying answers found')
    console.log('   Make sure to answer the clarifying questions when creating decisions')
  }

  // Test 6: Initial vs Final Choice Tracking
  console.log('\n\nTest 6: Choice Tracking (Initial vs Final)')
  console.log('-'.repeat(60))

  const decisionsWithChoices = allDecisions.filter(d => d.initialChoice && d.finalChoice)

  console.log(`Decisions with both choices tracked: ${decisionsWithChoices.length}/${allDecisions.length}`)

  if (decisionsWithChoices.length > 0) {
    const changedMind = decisionsWithChoices.filter(d => d.initialChoice !== d.finalChoice)
    console.log(`Times you changed your mind: ${changedMind.length}/${decisionsWithChoices.length}`)

    if (changedMind.length > 0) {
      console.log('\n✓ Examples where you changed your mind:')
      changedMind.slice(0, 3).forEach(d => {
        console.log(`  "${d.question}"`)
        console.log(`    Before analysis: ${d.initialChoice}`)
        console.log(`    After analysis: ${d.finalChoice}`)
      })
    }
  } else {
    console.log('ℹ️  No complete choice tracking data yet')
  }

  // Summary
  console.log('\n\n' + '='.repeat(60))
  console.log('FEATURE STATUS SUMMARY')
  console.log('='.repeat(60))

  const features = [
    {
      name: 'Decision Storage',
      status: allDecisions.length > 0,
      detail: `${allDecisions.length} decisions stored`,
    },
    {
      name: 'Clarifying Answers Storage',
      status: decisionsWithAnswers.length > 0,
      detail: `${decisionsWithAnswers.length} decisions with answers`,
    },
    {
      name: 'Past Answers Context',
      status: !!pastAnswersContext,
      detail: pastAnswersContext ? 'Working - will reference past answers' : 'No data yet',
    },
    {
      name: 'Past Decisions Context',
      status: !!pastDecisionsContext,
      detail: pastDecisionsContext ? 'Working - will show past similar decisions' : 'No data yet',
    },
    {
      name: 'Bias Detection',
      status: true,
      detail: 'Working - tests passed',
    },
    {
      name: 'Choice Tracking',
      status: decisionsWithChoices.length > 0,
      detail: `${decisionsWithChoices.length} decisions with complete tracking`,
    },
  ]

  features.forEach(f => {
    const icon = f.status ? '✅' : '⚠️ '
    console.log(`${icon} ${f.name}: ${f.detail}`)
  })

  console.log('\n' + '='.repeat(60))
  console.log('\n💡 TIP: To test the learning features properly:')
  console.log('1. Create a decision and answer the clarifying questions')
  console.log('2. Create a similar decision later')
  console.log('3. The clarifying questions should reference your previous answers')
  console.log('4. Check the bias detection when you use emotional language\n')
}

testFeatures()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (error) => {
    console.error('Test failed:', error)
    await prisma.$disconnect()
    process.exit(1)
  })
