# 🌌 Galaxy Workflow Creator

Welcome to the **Galaxy Workflow Creator**! This is a modern, high-performance web application built to help users design, manage, and execute complex workflows visually.

## ✨ Features

- **Visual Workflow Builder**: Intuitive drag-and-drop interface powered by [React Flow](https://reactflow.dev/).
- **AI Integration**: Built-in support for Google's Generative AI (Gemini) to help automate and generate workflow steps.
- **Background Jobs**: Reliable background job processing using [Trigger.dev](https://trigger.dev/).
- **Authentication**: Secure and seamless user authentication powered by [Clerk](https://clerk.dev/).
- **Database**: Robust data management with PostgreSQL, interfaced via [Prisma ORM](https://www.prisma.io/).
- **Caching & Rate Limiting**: Accelerated performance using [Upstash Redis](https://upstash.com/).
- **Modern UI**: Styled with [Tailwind CSS](https://tailwindcss.com/) and accessible components from [Radix UI](https://www.radix-ui.com/).

## 🚀 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL + Prisma
- **Auth**: Clerk
- **AI**: `@google/genai`
- **State Management**: React Flow

## 🛠️ Getting Started

### Prerequisites

Make sure you have Node.js and npm installed. You will also need accounts for the various third-party services (Clerk, Trigger.dev, Upstash, Google AI) to set up your environment variables.

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Vitesh21/Galaxy-workflow-creator.git
   cd nextflow
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up Environment Variables:**

   Create a `.env` file in the root directory and add your keys based on the `.env.example` or the required services (Clerk, Database URL, Trigger.dev, etc.).

4. **Run Database Migrations:**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the Development Server:**

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application in action.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is privately owned. All rights reserved.
