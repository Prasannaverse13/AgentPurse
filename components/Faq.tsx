'use client';

import { useState } from 'react';

const items = [
  { q: 'What is AgentPurse?', a: 'AgentPurse is a PayPal wallet for AI agents. You give each agent a budget and rules. The agent asks AgentPurse before it spends. Small safe buys go through on their own and risky ones wait for your yes.' },
  { q: 'Does my agent ever see my PayPal login?', a: 'No. Agents only get a scoped AgentPurse key. The PayPal connection lives on our server and every payment runs through the rule engine first.' },
  { q: 'Which agents can use it?', a: 'Any agent that can call an MCP tool or a REST API. That covers Claude, ChatGPT, LangChain, CrewAI and custom agents.' },
  { q: 'What happens if an agent buys the wrong thing?', a: 'Open the ledger and tap refund. AgentPurse calls the PayPal refund API and logs the reason next to the order.' },
  { q: 'Is this live money?', a: 'The hackathon build runs on the PayPal sandbox, so every payment in the demo is test money.' },
];

export default function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div>
      {items.map((it, i) => (
        <div key={it.q} className="faq-item" data-open={open === i}>
          <button className="faq-q" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
            <span>{it.q}</span>
            <span aria-hidden>+</span>
          </button>
          <div className="faq-a"><div><p>{it.a}</p></div></div>
        </div>
      ))}
    </div>
  );
}
