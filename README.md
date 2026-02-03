# Coin Flip Decision Maker

An AI-powered decision-making tool that helps you make better choices by analyzing your options, detecting emotional bias, and learning from your past decisions.

## Features

### Core Decision Making
- **AI Analysis**: Get comprehensive analysis of your decision options using GPT-4
- **Weighted Recommendations**: Receive weighted scores for each option with best/worst case scenarios
- **Key Factors**: Identify the most important factors influencing your decision

### Intelligent Context
- **Clarifying Questions**: AI generates personalized questions to understand your situation better
- **Past Answers Context**: System remembers your previous answers to similar questions (with timestamps)
- **Decision History**: References your past decisions on similar topics to provide consistent advice
- **Temporal Awareness**: Timestamps help AI understand if past preferences are still relevant

### Bias Detection
- **Emotional Bias Detection**: Identifies when your initial choice contradicts the rational analysis
- **Choice Tracking**: Compares your initial gut feeling with your final decision
- **Self-Awareness**: Helps you understand your decision-making patterns

### User Experience
- **Decision History**: View all your past decisions with full context and analysis
- **Bulk Operations**: Delete multiple decisions at once
- **Secure Authentication**: Supabase Auth with email/password
- **Row Level Security**: Your decisions are private and secure

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **Database**: [Supabase PostgreSQL](https://supabase.com)
- **ORM**: [Prisma](https://www.prisma.io)
- **Authentication**: [Supabase Auth](https://supabase.com/docs/guides/auth)
- **AI**: [OpenAI GPT-4](https://openai.com)

## Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) account
- An [OpenAI API](https://platform.openai.com) key

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/aids-benedict/coin-flip-it.git
cd coin-flip-it
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="your-supabase-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Database
DATABASE_URL="your-supabase-database-url"
DIRECT_URL="your-supabase-direct-database-url"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"
```

Get your Supabase credentials from:
- Project URL: `https://app.supabase.com/project/YOUR_PROJECT/settings/api`
- API Keys: Same page (anon key and service role key)
- Database URLs: `https://app.supabase.com/project/YOUR_PROJECT/settings/database`

### 4. Set Up the Database

Run the Prisma migrations:

```bash
npx prisma generate
npx prisma db push
```

Apply the Supabase migrations for RLS policies:

```bash
# Enable RLS policies
npx supabase db execute --file migrations/enable-rls-policies.sql
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
coin-flip-it/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── history/           # Decision history page
│   ├── login/             # Login page
│   └── register/          # Registration page
├── components/            # React components
│   ├── DecisionMaker.tsx  # Main decision interface
│   ├── CoinFlip.tsx       # Coin flip animation
│   └── Providers.tsx      # Auth context provider
├── lib/                   # Utility functions
│   ├── supabase/         # Supabase client setup
│   ├── decision-helpers.ts # Decision context & bias detection
│   └── api-helpers.ts    # Auth helpers
├── prisma/               # Database schema
├── scripts/              # Migration & optimization scripts
└── migrations/           # SQL migrations

```

## Database Schema

### Decision Table
- `id`: Unique identifier
- `userId`: Reference to auth.users (UUID)
- `question`: The decision question
- `options`: Available choices
- `analysis`: AI-generated analysis
- `weights`: Option weights
- `result`: Recommendation
- `explanation`: Detailed reasoning
- `initialChoice`: User's gut feeling
- `finalChoice`: User's final decision
- `clarifyingAnswers`: Q&A context
- `createdAt`: Timestamp

## Security Features

- **Row Level Security (RLS)**: Users can only access their own decisions
- **Supabase Auth**: Secure authentication with JWT tokens
- **UUID Foreign Keys**: Proper relationship with auth.users
- **Optimized Policies**: RLS policies use subselects for better performance

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables (same as `.env` file)
5. Deploy

Vercel will automatically deploy on every push to your main branch.

### Environment Variables for Production

Make sure to set all environment variables in your Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `DIRECT_URL`
- `OPENAI_API_KEY`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org)
- Powered by [OpenAI GPT-4](https://openai.com)
- Database and Auth by [Supabase](https://supabase.com)
- Co-created with [Claude Code](https://claude.com/claude-code)
