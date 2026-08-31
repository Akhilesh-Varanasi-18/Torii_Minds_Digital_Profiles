export const defaultResumeData = {
  personal: {
    fullName: "Rahul Varma",
    title: "Software Developer",
    location: "Surampalem, Andhra Pradesh, India",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400"
  },
  // Social / Contact Links array (Matching reference image, email removed)
  socialLinks: [
    { id: "github", label: "GitHub", icon: "github", url: "https://github.com", visible: true },
    { id: "linkedin", label: "LinkedIn", icon: "linkedin", url: "https://linkedin.com", visible: true },
    { id: "leetcode", label: "LeetCode", icon: "leetcode", url: "https://leetcode.com", visible: true },
    { id: "codechef", label: "CodeChef", icon: "codechef", url: "https://codechef.com", visible: true },
    { id: "geeksforgeeks", label: "GeeksforGeeks", icon: "geeksforgeeks", url: "https://geeksforgeeks.org", visible: true }
  ],
  summary: "Enthusiastic and detail-oriented Software Developer with a strong foundation in Data Structures, Algorithms, and full-stack development. Skilled in building scalable web and mobile applications using modern technologies. Passionate about problem solving, clean code, and continuous learning.",
  coding: {
    languages: "C++ | Java | Python | Dart | Go | JavaScript",
    concepts: [
      "OOPs",
      "DSA",
      "STL",
      "Algorithms",
      "Data Structures",
      "Problem Solving",
      "Time & Space Complexity",
      "Git & GitHub"
    ]
  },
  // Dynamic list of Problem Solving Platforms (LeetCode, CodeChef, GeeksforGeeks, etc.)
  problemPlatforms: [
    {
      id: "leetcode",
      name: "LeetCode",
      visible: true,
      solved: "550+",
      rating: "1780",
      rank: "Top 30%",
      easy: 230,
      medium: 260,
      hard: 60,
      profileUrl: "https://leetcode.com"
    },
    {
      id: "codechef",
      name: "CodeChef",
      visible: true,
      solved: "300+",
      rating: "1650",
      rank: "2-Star",
      easy: 150,
      medium: 120,
      hard: 30,
      profileUrl: "https://codechef.com"
    },
    {
      id: "geeksforgeeks",
      name: "GeeksforGeeks",
      visible: true,
      solved: "400+",
      rating: "1820",
      rank: "Top 15%",
      easy: 180,
      medium: 180,
      hard: 40,
      profileUrl: "https://geeksforgeeks.org"
    }
  ],
  activePlatformId: "leetcode",
  technologies: [
    { category: "Frontend", items: "HTML • CSS • JavaScript • Dart • Flutter" },
    { category: "Backend", items: "Go (Golang) • REST APIs • JWT • Node.js • Express.js" },
    { category: "Database", items: "MongoDB • Firebase • MySQL" },
    { category: "Tools", items: "Git • GitHub • Postman • VS Code • Android Studio" }
  ],
  aiSkills: [
    "Prompt Engineering",
    "AI Model Integration",
    "RAG & Vector Databases",
    "LangChain",
    "LLMs (GPT, Gemini, Claude)",
    "Python for AI",
    "NLP Basics",
    "AI Tools & APIs"
  ],
  projects: [
    {
      id: "p1",
      title: "Stock Market Tracker",
      techStack: "Flutter • Go • MongoDB",
      description: "A full-stack application to track real-time stock data, manage watchlists, and analyze market trends.",
      features: "Real-time data, Watchlist, Caching, Analytics, Request limiter (25 API calls/user/day).",
      link: "https://github.com"
    },
    {
      id: "p2",
      title: "HOOT – LSRW Skills App",
      techStack: "Flutter • REST API • MongoDB",
      description: "Developed a mobile app to improve students' Listening, Speaking, Reading and Writing skills.",
      features: "Audio recording, STT/TTS, Progress tracking, REST integration.",
      link: "https://github.com"
    },
    {
      id: "p3",
      title: "Notes REST API",
      techStack: "Go • MongoDB • JWT",
      description: "A RESTful Notes service with user authentication, email verification, and CRUD operations.",
      features: "JWT Auth, Email verification, CRUD operations, Secure & scalable APIs.",
      link: "https://github.com"
    }
  ],
  achievements: [
    {
      id: "a1",
      icon: "leetcode",
      title: "LeetCode",
      description: "Solved 550+ problems and earned 7 badges."
    },
    {
      id: "a2",
      icon: "codechef",
      title: "CodeChef",
      description: "Achieved 2-star rating."
    },
    {
      id: "a3",
      icon: "certification",
      title: "Certifications",
      description: "C++ (Coding), Python (Pearson, Cisco)."
    },
    {
      id: "a4",
      icon: "download",
      title: "HOOT App",
      description: "1K+ downloads on Play Store & App Store."
    }
  ],
  sectionsOrder: [
    { id: "summary", title: "PROFESSIONAL SUMMARY", icon: "summary", visible: true, removable: false },
    { id: "coding_stats", title: "CODING & PROBLEM SOLVING", icon: "coding", visible: true, removable: true },
    { id: "technologies", title: "TECHNOLOGIES", icon: "technologies", visible: true, removable: true },
    { id: "ai_skills", title: "AI SKILLS", icon: "aiSkills", visible: true, removable: true },
    { id: "projects", title: "PROJECTS", icon: "projects", visible: true, removable: true },
    { id: "achievements", title: "ACHIEVEMENTS", icon: "achievements", visible: true, removable: true }
  ]
};
