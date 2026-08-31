// Heuristic extraction of structured fields from raw OCR text of a certificate.
// Best-effort — the editor always lets the user correct the result.

export interface CertFields {
  technology?: string;
  certification?: string;
  issuer?: string;
  verificationId?: string;
  verificationUrl?: string;
}

// Well-known issuers — matched case-insensitively anywhere in the text.
const ISSUERS: Array<[RegExp, string]> = [
  [/amazon web services|aws\b/i, "Amazon Web Services"],
  [/microsoft/i, "Microsoft"],
  [/google\s*cloud|google/i, "Google"],
  [/coursera/i, "Coursera"],
  [/\bedx\b/i, "edX"],
  [/udemy/i, "Udemy"],
  [/udacity/i, "Udacity"],
  [/\bmeta\b/i, "Meta"],
  [/oracle/i, "Oracle"],
  [/\bibm\b/i, "IBM"],
  [/hackerrank/i, "HackerRank"],
  [/nptel/i, "NPTEL"],
  [/linkedin/i, "LinkedIn Learning"],
  [/deeplearning\.?ai/i, "DeepLearning.AI"],
  [/freecodecamp/i, "freeCodeCamp"],
  [/simplilearn/i, "Simplilearn"],
  [/geeksforgeeks/i, "GeeksforGeeks"],
  [/great\s*learning/i, "Great Learning"],
  [/coding\s*ninjas/i, "Coding Ninjas"],
  [/\bscaler\b/i, "Scaler"],
  [/cisco/i, "Cisco"],
  [/red\s*hat/i, "Red Hat"],
  [/mongodb/i, "MongoDB"],
  [/\bgithub\b/i, "GitHub"],
  [/kaggle/i, "Kaggle"],
  [/infosys|springboard/i, "Infosys Springboard"],
  [/\btcs\b|tata consultancy/i, "TCS iON"],
];

// Technology keywords → canonical name (first match wins).
const TECH: Array<[RegExp, string]> = [
  [/react\s*native/i, "React Native"],
  [/\breact\b/i, "React"],
  [/next\.?js/i, "Next.js"],
  [/node\.?js|nodejs/i, "Node.js"],
  [/typescript/i, "TypeScript"],
  [/javascript/i, "JavaScript"],
  [/\bpython\b/i, "Python"],
  [/\bjava\b/i, "Java"],
  [/\bc\+\+/i, "C++"],
  [/kubernetes/i, "Kubernetes"],
  [/docker/i, "Docker"],
  [/\baws\b/i, "AWS"],
  [/\bazure\b/i, "Azure"],
  [/tensorflow/i, "TensorFlow"],
  [/pytorch/i, "PyTorch"],
  [/lang\s*chain/i, "LangChain"],
  [/hugging\s*face/i, "Hugging Face"],
  [/prompt\s*engineering/i, "Prompt Engineering"],
  [/retrieval[-\s]*augmented|(?:\brag\b)/i, "RAG"],
  [/generative\s*ai|gen\s*ai/i, "Generative AI"],
  [/large\s*language\s*model|\bllms?\b/i, "LLMs"],
  [/stable\s*diffusion/i, "Stable Diffusion"],
  [/computer\s*vision/i, "Computer Vision"],
  [/natural\s*language\s*processing|\bnlp\b/i, "NLP"],
  [/openai|chatgpt|gpt-?\d/i, "OpenAI"],
  [/machine\s*learning/i, "Machine Learning"],
  [/deep\s*learning/i, "Deep Learning"],
  [/data\s*science/i, "Data Science"],
  [/\bsql\b|mysql|postgres/i, "SQL"],
  [/\bmongodb\b/i, "MongoDB"],
  [/\bhtml\b/i, "HTML"],
  [/\bcss\b/i, "CSS"],
  [/\bgit\b/i, "Git"],
];

function cleanLine(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

// Cut a captured title at the first "next-field" phrase (OCR often flattens
// the whole certificate onto one line, so a greedy match runs past the title).
function trimTitle(s: string): string {
  const cut = s.split(
    /\b(?:issued\s+by|issued|offered\s+by|authorized\s+by|credential|verification|certificate\s*(?:id|no)|date\b|awarded|presented|signature|instructor|valid\s|completed\s+on|on\s+\w+\s+\d{4}|for\s+successfully)\b/i
  )[0];
  return cleanLine(cut).replace(/[",.;:\-–\s]+$/, "").trim();
}

export function parseCertificateText(raw: string): CertFields {
  const text = raw.replace(/\r/g, "");
  const lines = text
    .split("\n")
    .map(cleanLine)
    .filter((l) => l.length > 1);
  const flat = lines.join(" ");
  const out: CertFields = {};

  // --- Verification / credential ID -------------------------------------
  const idLabel = flat.match(
    /(?:credential|verification|certificate|licen[sc]e|registration|serial|enrol(?:l)?ment|reference)\s*(?:id|no\.?|number|code|#)?\s*[:#\-]?\s*([A-Za-z0-9][A-Za-z0-9\-\/]{4,})/i
  );
  if (idLabel) out.verificationId = idLabel[1].toUpperCase();
  else {
    // Fallback: a standalone long alphanumeric token that contains a digit.
    const token = flat.match(/\b(?=[A-Z0-9\-]*\d)[A-Z0-9]{2,}[A-Z0-9\-]{6,}\b/);
    if (token) out.verificationId = token[0].toUpperCase();
  }

  // --- Verification URL --------------------------------------------------
  const url = flat.match(/https?:\/\/[^\s"'<>]+/i);
  if (url) {
    const u = url[0].replace(/[.,)]+$/, "");
    if (/verif|credential|badge|certificate|coursera|udemy|credly/i.test(u)) out.verificationUrl = u;
  }

  // --- Issuer ------------------------------------------------------------
  for (const [re, name] of ISSUERS) {
    if (re.test(flat)) {
      out.issuer = name;
      break;
    }
  }

  // --- Certification title ----------------------------------------------
  // Pattern 1: "...has successfully completed <TITLE>"
  let title =
    flat.match(
      /(?:successfully\s+)?completed\s+(?:the\s+)?(?:course\s+)?["“]?([A-Za-z0-9][^"”\n.]{5,80})/i
    )?.[1] ||
    flat.match(/certificate\s+of\s+\w+\s+(?:for|in)\s+([A-Za-z0-9][^\n.]{5,80})/i)?.[1];

  if (!title) {
    // Fallback: the longest line that isn't the issuer, a date, or boilerplate.
    const boilerplate = /certificate|completion|achievement|awarded|presented|this is to certify|congratulations|date|signature/i;
    const candidates = lines
      .filter((l) => l.length >= 8 && l.length <= 80 && !boilerplate.test(l))
      .filter((l) => !ISSUERS.some(([re]) => re.test(l)))
      .sort((a, b) => b.length - a.length);
    if (candidates[0]) title = candidates[0];
  }
  if (title) {
    const trimmed = trimTitle(title);
    if (trimmed.length >= 3) out.certification = trimmed;
  }

  // --- Technology (from title, else whole text) --------------------------
  const hay = `${out.certification ?? ""} ${flat}`;
  for (const [re, name] of TECH) {
    if (re.test(hay)) {
      out.technology = name;
      break;
    }
  }

  return out;
}
