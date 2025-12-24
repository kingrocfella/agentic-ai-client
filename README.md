# AI Agent Client

A modern Next.js chat application that provides a ChatGPT-like interface for interacting with AI agents. Features real-time streaming responses, authentication, and markdown rendering.

## Live Demo

🌐 **Live Application**: [https://aiagent.kingsley-api.name.ng/](https://aiagent.kingsley-api.name.ng/)

Try out the application with a live demo at the link above.

## Features

- **Real-time Chat Interface**: ChatGPT-style chatbox with streaming responses
- **Authentication**: Secure login, registration, and logout with httpOnly cookies
- **Streaming API**: Server-Sent Events (SSE) for real-time message streaming
- **Markdown Rendering**: Rich markdown support with syntax highlighting
- **Auto-logout on 401**: Automatic logout and redirect when authentication expires
- **Route Protection**: Protected routes with automatic redirect to login
- **Dark Mode Support**: Built-in dark mode styling
- **Comprehensive Testing**: Full test coverage with Jest and React Testing Library

## Tech Stack

- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Markdown**: react-markdown with remark-breaks
- **Testing**: Jest, React Testing Library, @testing-library/user-event
- **Authentication**: Token-based with httpOnly cookies

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:

```bash
git clone https://github.com/kingrocfella/agentic-ai-client
cd agentic-ai-client
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory:

```env
AGENT_API_BASE_URL=http://localhost:9000
COOKIE_AGE_DAYS=7
NODE_ENV=development
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Docker Deployment

### Using Docker Compose

1. Create a `.env` file in the root directory:

```env
AGENT_API_BASE_URL=http://localhost:9000
COOKIE_AGE_DAYS=7
NODE_ENV=production
```

2. Build and run with Docker Compose:

```bash
docker-compose up -d
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Using Docker directly

1. Build the Docker image:

```bash
docker build -t ai-agent-client .
```

2. Run the container:

```bash
docker run -p 3000:3000 --env-file .env ai-agent-client
```

**Note**: The Dockerfile uses Next.js standalone output mode for optimized production builds.

## Project Structure

```
ai-agent-client/
├── app/
│   ├── api/
│   │   ├── auth/          # Authentication API routes
│   │   │   ├── login/     # POST /api/auth/login
│   │   │   ├── logout/    # GET /api/auth/logout
│   │   │   └── register/  # POST /api/auth/register
│   │   └── chat/          # GET /api/chat - Streaming chat endpoint
│   ├── components/        # React components
│   │   ├── ChatBox.tsx    # Main chat interface
│   │   ├── MarkdownRenderer.tsx
│   │   ├── SendIcon.tsx
│   │   └── LoadingSpinner.tsx
│   ├── lib/               # Utility functions
│   │   ├── api.ts         # Client-side API functions
│   │   └── auth.ts        # Authentication utilities
│   ├── login/             # Login/Register page
│   └── page.tsx           # Home page (protected)
├── proxy.ts               # Route protection middleware
├── Dockerfile             # Multi-stage Docker build
├── docker-compose.yml     # Docker Compose configuration
└── jest.config.js         # Jest configuration
```

## Authentication Flow

1. **Login/Register**: Users authenticate via `/login` page
2. **Token Storage**: Access tokens stored in httpOnly cookies with `sameSite: "strict"`
3. **Protected Routes**: Home page requires authentication (handled by `proxy.ts`)
4. **Auto-logout**: On 401 responses, cookies are cleared and user is redirected to login
5. **Logout**: Explicit logout clears cookies and calls external logout API

## Testing

Run tests with:

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Key Features Implementation

### Streaming Responses

The application uses Server-Sent Events (SSE) for real-time streaming:

1. Client creates `EventSource` connection to `/api/chat`
2. Next.js API route proxies request to external AI agent API
3. Response stream is forwarded to client
4. Client processes chunks and updates UI in real-time

### Markdown Rendering

- Uses `react-markdown` with `remark-breaks` plugin
- Supports headings, lists, code blocks, inline code, blockquotes
- Custom styling with Tailwind CSS

### Route Protection

- Implemented via `proxy.ts` (Next.js proxy pattern)
- Protects home page (`/`)
- Allows `/login` and `/api/*` routes without authentication
- Redirects unauthenticated users to login with redirect parameter

## Development

### Building for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```
