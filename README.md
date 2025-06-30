# Website to Voice Agent

Convert any company website into an intelligent voice agent that acts as brand ambassador and captures leads 24/7.

Try demo here - https://boss-profit-giants-blade.trycloudflare.com/

<img width="1728" alt="Screenshot 2025-06-30 at 7 48 46 AM" src="https://github.com/user-attachments/assets/1c2325ac-3243-4b8a-9380-865205b24b08" />

## What It Does


1. **Analyze any company website** → AI researches your business and products
2. **Generate voice agent** → Creates a custom AI rep based on brand data
3. **Qualify leads live** → Engages callers in natural conversation
4. **Capture leads** → Runs a post-analysis of transcript and saves result to Google Sheets

## Architecture diagram
<img width="820" alt="Screenshot 2025-06-30 at 6 27 15 AM" src="https://github.com/user-attachments/assets/ea9994b3-4859-40db-a6ef-09e5ff871089" />

## Setup

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Setup Google Sheets Integration**
   
   a. **Create Google Service Account:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google Sheets API
   - Go to "Credentials" → "Create Credentials" → "Service Account"
   - Download the JSON key file and save as `google_service_key.json` in the backend directory
   
   b. **Create Google Sheet:**
   - Create a new Google Sheet for storing leads
   - Copy the Sheet ID from the URL (the long string between `/d/` and `/edit`)
   - Share the sheet with your service account email (found in the JSON file)
   - Give "Editor" permissions

5. **Configure environment**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   GOOGLE_SERVICE_KEY_PATH=./google_service_key.json
   LEADS_SHEET_ID=your_google_sheet_id_here
   ```

6. **Run the backend server**
   ```bash
   uvicorn server:app --reload --host 0.0.0.0 --port 7860
   ```
   
   Server runs on `http://localhost:7860`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Use Node.js 20**
   ```bash
   nvm use 20
   ```

3. **Install dependencies**
   ```bash
   pnpm install
   ```

4. **Run development server**
   ```bash
   pnpm dev
   ```
   
   Frontend runs on `http://localhost:3000`

## Usage

1. **Start both servers** (backend on 7860, frontend on 3000)
2. **Open** `http://localhost:3000` in your browser
3. **Enter website URL** (e.g., `terminix.com`, `mutualofomaha.com`)
4. **AI generates custom voice agent** based on company analysis
5. **Connect and test** the voice agent
6. **Post-session analysis** runs on conversation transcript to extract lead intel
7. **Results saved** to Google Sheet with lead analysis details

## Requirements

- Python 3.8+
- Node.js 20+
- OpenAI API key ([Get one here](https://platform.openai.com/))
- Deepgram API key ([Get one here](https://console.deepgram.com/))
- Google Service Account (setup instructions above)
- Google Sheet for lead info storage
- Microphone access in browser
