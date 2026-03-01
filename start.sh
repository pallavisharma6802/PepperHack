#!/bin/bash
# Start both backend and frontend for MadisonBites

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  MadisonBites - Starting Services${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check environment
if [ ! -f ".env" ]; then
    echo -e "${RED}⚠️  Missing .env file${NC}"
    echo "Create .env with:"
    echo "  GEMINI_API_KEY=your_key_here"
    echo "  GOOGLE_API_KEY=your_key_here"
    exit 1
fi

# Start backend
echo -e "${GREEN}🐍 Starting Backend (FastAPI)...${NC}"
source /Users/Patron/Desktop/Hackathon/.venv/bin/activate
cd /Users/Patron/Desktop/Hackathon/PepperHack
python -m uvicorn backend.main:app --reload --port 2026 &
BACKEND_PID=$!
echo -e "${GREEN}   Backend PID: $BACKEND_PID${NC}\n"

# Wait for backend to start
sleep 3

# Start frontend
echo -e "${BLUE}⚛️  Starting Frontend (Vite)...${NC}"
npm run dev &
FRONTEND_PID=$!
echo -e "${BLUE}   Frontend PID: $FRONTEND_PID${NC}\n"

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Services Running${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Frontend: ${BLUE}http://localhost:5173${NC}"
echo -e "Backend:  ${BLUE}http://localhost:2026${NC}"
echo -e "\nPress Ctrl+C to stop all services\n"

# Trap Ctrl+C to clean up
trap "echo '\n\n${RED}🛑 Stopping services...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

# Wait for user interrupt
wait
