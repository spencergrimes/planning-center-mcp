# Planning Center MCP - Frontend

This is the React frontend for the Planning Center MCP server, providing a chat interface to interact with Planning Center data through AI-powered tools.

## Features

- **Authentication**: Login/Register for organizations
- **Real-time Chat**: WebSocket-based chat interface  
- **AI Tools Integration**: Natural language queries for Planning Center data
- **Responsive UI**: Mobile-friendly design with Tailwind CSS
- **Error Handling**: Comprehensive error states and loading indicators

## Getting Started

### Prerequisites

- Node.js 18+ 
- Planning Center MCP backend server running on port 3001

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your backend API URL:
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001/ws
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## Usage

### Authentication

1. **Register**: Create a new organization account
2. **Login**: Sign in with email, password, and organization ID
3. **Connect Planning Center**: Admin users can connect their Planning Center account

### Chat Interface

The chat interface supports natural language queries:

- "Show me upcoming services"
- "Find songs with the theme 'Christmas'" 
- "Who's on the worship team?"
- "Search for John Smith"

### Quick Actions

Use the quick action buttons for common requests:
- 📅 Upcoming Services
- 👥 Team Members  
- 🎵 Worship Songs

## Architecture

- **React 18+**: Modern React with hooks
- **TypeScript**: Full type safety
- **Zustand**: State management  
- **Tailwind CSS**: Utility-first styling
- **WebSocket**: Real-time communication
- **Axios**: HTTP client for API calls

## Components

- `Chat`: Main chat interface
- `MessageList`: Message history display
- `MessageInput`: Message input with quick actions
- `Login/Register`: Authentication forms

## Development Notes

- WebSocket connection automatically reconnects on disconnect
- Messages support both text and JSON formatting
- Authentication uses HTTP-only cookies for security
- Environment variables prefixed with `VITE_` are exposed to the client

## Deployment

Build the project and serve the `dist` folder with any static file server:

```bash
npm run build
# Serve dist/ folder
```

For production deployment, ensure:
- Update `VITE_API_URL` to your production backend
- Use HTTPS for WebSocket connections (`wss://`)
- Configure CORS on the backend for your frontend domain