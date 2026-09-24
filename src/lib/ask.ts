/**
 * "Ask Akshay" — phase 1 answers are canned, verified copy (v1's prompts,
 * word for word). Phase 7 replaces `answer()` with a streamed, retrieval-
 * grounded call; the island only depends on this module's shape.
 */
export const ASK_INTRO = 'Ask about production AI, Voice AI, RAG, architecture or measurable impact.';

export const ASK_PROMPTS = [
  {
    label: 'Why Akshay?',
    answer:
      'He owns the whole path: scoping with stakeholders, proving it with a working POC, then building, evaluating and operating it. 20+ production LLM systems so far, including a Voice AI proof of concept that won a major enterprise contract.',
  },
  {
    label: 'Voice AI impact',
    answer:
      'A three-agent Voice AI workflow on LiveKit, Twilio SIP and Salesforce cut request-queue latency from two days to three minutes (99.9%) and fulfilment time by 87.5%, with real-time HIPAA- and PCI-DSS-aligned guardrails.',
  },
  {
    label: 'Scale',
    answer:
      'An autonomous ReAct agent serving 3M+ US SMBs at under three seconds to first token, calling 10 tools across 10 data sources, with hybrid retrieval and re-ranking lifting output accuracy above 95%.',
  },
  {
    label: 'Core expertise',
    answer:
      'Multi-agent orchestration (LangGraph, CrewAI), RAG with hybrid search and re-ranking, voice AI (LiveKit, Twilio SIP), structured outputs, LLM-as-Judge evaluation, MLflow and AWS deployment.',
  },
] as const;

export function answer(label: string): string | undefined {
  return ASK_PROMPTS.find((p) => p.label === label)?.answer;
}
