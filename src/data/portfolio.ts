/**
 * All visible copy lives here. Edit this file to change the site.
 * Leave a url as an empty string until you have a real profile or address.
 */

export type SocialLink = {
  label: string;
  url: string;
};

export type SkillGroup = {
  title: string;
  items: string[];
};

export type Project = {
  name: string;
  summary: string;
  features: string[];
  technologies: string;
};

export type Article = {
  title: string;
  year: string;
  description: string;
};

export const portfolio = {
  name: "Sankar MS",
  role: "AI Engineer",
  location: "India",
  headline: "Hi, I'm\nSankar MS.",
  tagline: "I build AI systems that ship.",
  heroSupport:
    "I'm an AI Engineer specializing in LLMs, RAG pipelines, and production ML systems. I design and deploy intelligent agents, fine-tune foundation models, and build the infrastructure that makes AI reliable at scale.",
  pills: ["LLMs & Fine-tuning", "RAG Pipelines", "MCP Agents", "Production MLOps"],
  seo: {
    title: "Sankar MS — AI Engineer",
    description:
      "AI Engineer focused on designing and deploying intelligent agents, fine-tuning foundation models, and building reliable AI systems that scale.",
  },
  nav: [
    { label: "About", href: "#about" },
    { label: "Experience", href: "#work" },
    { label: "Projects", href: "#projects" },
    { label: "Skills", href: "#stack" },
    { label: "Writing", href: "#writing" },
  ],
  cta: { label: "contact me →", href: "#contact" },
  actions: [
    { label: "view projects →", href: "#projects" },
    { label: "read my writing →", href: "#writing" },
  ],
  contactCta: { label: "say hello →", href: "#contact" },
  diagram: {
    command: "$ python train.py --model llama-3.1-8b --epochs 3",
    status: "~/sankar/llm-finetune",
    nodes: [
      { name: "llm/vllm", meta: "● 2M+ daily" },
      { name: "rag/legal", meta: "● −60% latency" },
      { name: "agent/mcp", meta: "● 3 teams" },
      { name: "tune/lora", meta: "● Llama 3.1 8B" },
    ],
    footer: "23 models · 12 repos · 3M+ calls",
  },
  organizations: {
    label: "Organizations",
    names: ["MorningSide AI", "Outskill", "RunDownUniversity", "GrowthSchool"],
  },
  about: {
    id: "about",
    title: "About me.",
    essay:
      "I've spent the last four years building AI systems that survive contact with production traffic — not demos, not prototypes, the kind that wake you up at 3am when latency spikes.",
    introduction: [] as string[],
    focus:
      "My focus is on the unglamorous parts of LLMs: efficient inference, reliable retrieval, evaluation harnesses, and the infrastructure that makes fine-tuning reproducible. I care about cost-per-token, p99 latency, and hallucination rates more than benchmark scores.",
    aside:
      "When I'm not shipping models, I write about what breaks at scale, contribute to open-source MCP tooling, and occasionally fine-tune models for low-resource Indian languages on a single GPU.",
  },
  specializations: {
    title: "Specializations.",
    items: [
      {
        title: "LLM Engineering",
        body: "Language models designed and deployed as production systems, not one-off demos.",
      },
      {
        title: "Retrieval-Augmented Generation",
        body: "Retrieval pipelines for large document sets, tuned for latency and reliability.",
      },
      {
        title: "AI Agents",
        body: "Agents that call tools, stay observable, and ship inside real products.",
      },
      {
        title: "Model Context Protocol",
        body: "MCP adoption and open-source tooling for how agents reach tools.",
      },
      {
        title: "Model Fine-tuning",
        body: "LoRA fine-tunes of foundation models, including Indian-language datasets.",
      },
      {
        title: "Production Machine Learning",
        body: "Systems that keep working after they meet production traffic.",
      },
      {
        title: "MLOps",
        body: "Experiment tracking and a model registry so training stays reproducible.",
      },
      {
        title: "Inference Optimization",
        body: "Cost-per-token, p99 latency, and inference paths that stay fast under load.",
      },
    ],
  },
  learning: {
    title: "currently learning",
    items: ["Mamba SSM", "Mixture of Experts", "Flash Attention 3", "RLHF from scratch"],
  },
  stats: [
    { value: "4+", label: "years exp" },
    { value: "23", label: "models shipped" },
    { value: "12", label: "open source repos" },
    { value: "3M+", label: "api calls served" },
  ],
  experience: {
    id: "work",
    title: "Where I've worked.",
    resume: "View Full Résumé →",
    company: "MorningSide AI",
    position: "Senior AI Engineer",
    duration: "2023 — Present",
    responsibilities: [
      "Built multilingual LLM inference pipeline serving 2M+ daily requests using vLLM + Triton",
      "Designed and deployed RAG system over 500GB legal document corpus; reduced query latency by 60%",
      "Fine-tuned Llama-3.1-8B on Indian language datasets using LoRA; achieved SOTA on IndicGLUE benchmark",
      "Led MCP agent framework adoption across 3 product teams; integrated with Anthropic Claude and OpenAI",
      "Implemented W&B experiment tracking and MLflow model registry for full reproducibility",
    ],
    technologies: "Python, vLLM, Triton, LoRA, LangChain, PostgreSQL, K8s.",
    otherOrganizations: "Other organizations listed: Outskill, RunDownUniversity, GrowthSchool.",
    windowFile: "work.yaml",
    windowLines: [
      "# work.yaml",
      "company: morningside-ai",
      "role: senior-ai-engineer",
      "span: 2023—present",
      "systems:",
      "  - vllm",
      "  - triton",
      "  - lora",
      "  - langchain",
      "  - postgresql",
      "  - kubernetes",
    ],
  },
  projects: {
    id: "projects",
    title: "Things I've built.",
    github: { label: "View all projects on GitHub →", url: "https://github.com" },
    items: [
      {
        name: "AgentKit — MCP Orchestration Framework",
        summary:
          "Open-source Python framework for building multi-agent systems using the Model Context Protocol. Ships with 15+ built-in tools, a visual debugger, and support for Claude, GPT-4, and local Ollama models.",
        features: ["★ 1.2k"],
        technologies: "Python, MCP, LangGraph, FastAPI, React.",
      },
      {
        name: "IndiaRAG — Multilingual Document QA",
        summary:
          "Production RAG pipeline optimized for Indian-language documents. Supports Hindi, Tamil, Telugu. Uses custom chunking strategies and BM25+dense hybrid retrieval. Deployed on GCP serving 50k users.",
        features: [],
        technologies: "Python, FAISS, Pinecone, LangChain, FastAPI.",
      },
      {
        name: "LLM Eval Bench",
        summary:
          "Automated evaluation harness for LLM outputs. Tests factuality, hallucination rate, latency, and cost across 12 model providers simultaneously. Open-sourced with 800+ GitHub stars.",
        features: ["★ 847"],
        technologies: "Python, OpenAI, Anthropic, vLLM, PostgreSQL.",
      },
      {
        name: "FineTune Dashboard",
        summary:
          "Web UI for managing LLM fine-tuning jobs. Connects to Hugging Face, tracks experiments in W&B, and deploys to Modal or Runpod with one click.",
        features: [],
        technologies: "React, FastAPI, Hugging Face, W&B, Modal.",
      },
      {
        name: "Structured Output Extractor",
        summary:
          "LLM-powered data extraction from unstructured documents — contracts, invoices, research papers. Achieves 94.3% field-level accuracy on internal benchmarks.",
        features: [],
        technologies: "Python, Instructor, Pydantic, GPT-4o, FastAPI.",
      },
      {
        name: "Context Window Manager",
        summary:
          "Library for intelligently managing LLM context windows at scale. Implements dynamic summarization, semantic chunking, and sliding window strategies. Reduces token costs by 40%.",
        features: [],
        technologies: "Python, tiktoken, LangChain, Redis.",
      },
    ] satisfies Project[],
  },
  stack: {
    id: "stack",
    title: "The stack.",
    lead: "The tools I use to train, serve, retrieve, and operate models in production.",
    groups: [
      {
        title: "ai / ml",
        items: [
          "PyTorch",
          "TensorFlow",
          "Hugging Face",
          "LangChain",
          "LlamaIndex",
          "vLLM",
          "Triton Inference",
          "ONNX",
          "Ollama",
          "PEFT / LoRA",
        ],
      },
      {
        title: "infrastructure",
        items: [
          "CUDA",
          "Docker",
          "Kubernetes",
          "Ray",
          "Modal",
          "RunPod",
          "Google Cloud Platform",
          "AWS",
          "MLflow",
          "Weights & Biases",
          "GitHub Actions",
        ],
      },
      {
        title: "data & storage",
        items: [
          "PostgreSQL",
          "Redis",
          "FAISS",
          "Pinecone",
          "Weaviate",
          "Qdrant",
          "Spark",
          "dbt",
          "Pandas",
          "Polars",
        ],
      },
      {
        title: "languages & apis",
        items: [
          "Python",
          "TypeScript",
          "FastAPI",
          "Node.js",
          "React",
          "GraphQL",
          "OpenAI API",
          "Anthropic API",
          "REST",
        ],
      },
    ] satisfies SkillGroup[],
  },
  writing: {
    id: "writing",
    title: "Words I've written.",
    items: [
      {
        title: "Why Your RAG Pipeline Is Lying to You",
        year: "2025",
        description:
          "The hidden failure modes in retrieval-augmented generation that nobody talks about in tutorials.\nread on medium →",
      },
      {
        title: "Fine-Tuning LLMs on a $50 Budget",
        year: "2025",
        description:
          "A practical guide to LoRA, QLoRA, and running training jobs on cheap cloud GPUs without losing your mind.\nread on medium →",
      },
      {
        title: "MCP: The Protocol That Will Kill REST for AI Agents",
        year: "2024",
        description:
          "How the Model Context Protocol changes the way agents interact with tools and why it matters.\nread on medium →",
      },
      {
        title: "Building a Production RAG System: Lessons from 6 Months of Failures",
        year: "2024",
        description:
          "Everything that went wrong deploying a RAG system at scale, and how we fixed it.\nread on medium →",
      },
    ] satisfies Article[],
  },
  contact: {
    id: "contact",
    title: "Get in touch.",
    paragraphs: [
      "I'm open to senior AI/ML engineering roles, consulting engagements, and interesting open-source collaborations. My inbox is always open.",
    ],
    email: "",
    socials: [
      { label: "github", url: "https://github.com" },
      { label: "linkedin", url: "https://linkedin.com" },
      { label: "twitter", url: "https://twitter.com" },
      { label: "huggingface", url: "https://huggingface.co" },
    ] satisfies SocialLink[],
  },
  footer: {
    mark: "Sankar MS",
    copyright: "© 2026 Sankar MS",
    location: "AI Engineer · India",
    credit: "designed & coded by sankar ms",
    builtOn: "built on llms · langchain · pytorch · open source",
    columns: [
      {
        title: "Navigate",
        links: [
          { label: "About", href: "#about" },
          { label: "Work", href: "#work" },
          { label: "Projects", href: "#projects" },
          { label: "Stack", href: "#stack" },
        ],
      },
      {
        title: "Writing",
        links: [
          { label: "Words", href: "#writing" },
          { label: "Contact", href: "#contact" },
        ],
      },
    ],
  },
  builtNote: "This page was built by cursors while you scrolled.",
  builtDetail:
    "Every line, guide, and word above was placed by a cursor working alongside the others.",
};
