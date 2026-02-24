// lib/vendors/seed-playbooks.ts
// Default system-provided playbooks for vendor risk management

export const DEFAULT_PLAYBOOKS = [
  {
    name: 'SLA Breach Response',
    description:
      'Standardized response procedure when a vendor fails to meet agreed-upon service level targets.',
    category: 'SLA_BREACH' as const,
    triggerCondition: 'Vendor SLA metric drops below target threshold',
    steps: [
      { title: 'Document breach details', description: 'Record which SLA metric was breached, the actual vs target values, and the time of occurrence.', order: 1 },
      { title: 'Notify vendor point of contact', description: 'Send formal notification to the vendor primary contact with breach details and request acknowledgment.', order: 2 },
      { title: 'Request root cause analysis', description: 'Ask the vendor to provide a root cause analysis (RCA) within an agreed timeframe.', order: 3 },
      { title: 'Escalate if unresolved within 48h', description: 'If no satisfactory response within 48 hours, escalate to vendor management and internal leadership.', order: 4 },
      { title: 'Evaluate penalty clauses', description: 'Review contract penalty clauses applicable to the breach and determine if financial remedies should be invoked.', order: 5 },
      { title: 'Update risk register', description: 'Record the breach in the risk register with severity, resolution status, and any follow-up actions.', order: 6 },
    ],
    isSystemProvided: true,
    isActive: true,
  },
  {
    name: 'Contract Renewal Prep',
    description:
      'Preparation workflow for upcoming vendor contract renewals to ensure favorable terms and continuity.',
    category: 'CONTRACT' as const,
    triggerCondition: 'Contract renewal date within 60 days',
    steps: [
      { title: 'Review current contract terms and performance', description: 'Assess current contract terms, pricing, and vendor performance metrics over the contract period.', order: 1 },
      { title: 'Gather feedback from stakeholders', description: 'Collect input from internal teams who interact with the vendor on service quality and satisfaction.', order: 2 },
      { title: 'Benchmark pricing against alternatives', description: 'Research market rates and alternative vendors to establish a negotiation baseline.', order: 3 },
      { title: 'Prepare negotiation points', description: 'Document key negotiation items including pricing adjustments, SLA improvements, and new requirements.', order: 4 },
      { title: 'Schedule renewal meeting with vendor', description: 'Arrange a renewal discussion meeting with vendor representatives and key internal stakeholders.', order: 5 },
      { title: 'Document agreed changes and sign', description: 'Finalize the renewed contract with all agreed changes, obtain necessary approvals, and execute.', order: 6 },
    ],
    isSystemProvided: true,
    isActive: true,
  },
  {
    name: 'Vendor Offboarding',
    description:
      'Structured process for terminating a vendor relationship while minimizing disruption and risk.',
    category: 'OPERATIONAL' as const,
    triggerCondition: 'Decision to terminate vendor relationship',
    steps: [
      { title: 'Review contract termination clauses', description: 'Examine the contract for notice periods, termination fees, and transition obligations.', order: 1 },
      { title: 'Notify vendor of termination intent', description: 'Send formal written notice to the vendor per contractual requirements.', order: 2 },
      { title: 'Plan data migration/handover', description: 'Create a detailed plan for migrating data, services, and knowledge to a replacement vendor or in-house.', order: 3 },
      { title: 'Revoke vendor access to systems', description: 'Remove all vendor credentials, API keys, VPN access, and physical access as appropriate.', order: 4 },
      { title: 'Settle outstanding invoices', description: 'Reconcile and process all pending invoices, credits, and final payments.', order: 5 },
      { title: 'Document lessons learned', description: 'Record what worked and what did not in the vendor relationship for future vendor selection.', order: 6 },
    ],
    isSystemProvided: true,
    isActive: true,
  },
  {
    name: 'Security Incident Response',
    description:
      'Response protocol when a vendor is involved in or reports a security incident affecting shared systems or data.',
    category: 'SECURITY' as const,
    triggerCondition: 'Vendor reports or is involved in a security incident',
    steps: [
      { title: 'Assess scope and impact', description: 'Determine the nature of the incident, affected systems, and potential data exposure.', order: 1 },
      { title: 'Isolate affected systems if needed', description: 'Take immediate containment actions such as revoking access or isolating compromised systems.', order: 2 },
      { title: 'Request incident report from vendor', description: 'Formally request a detailed incident report including timeline, root cause, and remediation steps.', order: 3 },
      { title: 'Evaluate data exposure risk', description: 'Assess whether sensitive data was compromised and determine notification obligations.', order: 4 },
      { title: 'Notify affected stakeholders', description: 'Inform internal stakeholders, customers, and regulators as required by policy and regulation.', order: 5 },
      { title: 'Update security requirements in contract', description: 'Revise vendor security requirements and contractual clauses based on lessons from the incident.', order: 6 },
    ],
    isSystemProvided: true,
    isActive: true,
  },
  {
    name: 'Cost Overrun Management',
    description:
      'Process for addressing and controlling vendor costs that have exceeded the approved budget threshold.',
    category: 'FINANCIAL' as const,
    triggerCondition: 'Vendor costs exceed budget by more than 10%',
    steps: [
      { title: 'Identify root cause of overrun', description: 'Analyze invoices and usage data to determine why costs exceeded the budget.', order: 1 },
      { title: 'Review original scope vs actual delivery', description: 'Compare contracted scope of work against actual deliverables to identify scope creep or pricing discrepancies.', order: 2 },
      { title: 'Negotiate cost adjustment with vendor', description: 'Discuss cost corrections, credits, or revised pricing with the vendor based on findings.', order: 3 },
      { title: 'Implement cost controls', description: 'Put in place spending caps, approval workflows, or usage monitoring to prevent future overruns.', order: 4 },
      { title: 'Update budget forecasts', description: 'Revise budget projections and communicate changes to finance and management stakeholders.', order: 5 },
    ],
    isSystemProvided: true,
    isActive: true,
  },
  {
    name: 'Delivery Delay Mitigation',
    description:
      'Action plan for managing vendor delivery delays that impact project timelines and business operations.',
    category: 'DELIVERY' as const,
    triggerCondition: 'Vendor deliverable is more than 5 days late',
    steps: [
      { title: 'Request status update from vendor', description: 'Contact the vendor for an explanation of the delay and a revised delivery estimate.', order: 1 },
      { title: 'Assess impact on project timeline', description: 'Evaluate how the delay affects downstream dependencies, milestones, and business commitments.', order: 2 },
      { title: 'Identify alternative solutions or workarounds', description: 'Explore interim solutions, partial deliveries, or alternative providers to minimize business impact.', order: 3 },
      { title: 'Escalate if delay exceeds 2 weeks', description: 'Engage vendor senior management and internal leadership if the delay is not resolved within two weeks.', order: 4 },
      { title: 'Negotiate revised delivery schedule', description: 'Formalize a new delivery timeline with clear milestones and penalties for further delays.', order: 5 },
    ],
    isSystemProvided: true,
    isActive: true,
  },
  {
    name: 'Compliance Gap Remediation',
    description:
      'Workflow for addressing compliance deficiencies identified during vendor audits or assessments.',
    category: 'SECURITY' as const,
    triggerCondition: 'Vendor fails compliance audit or assessment',
    steps: [
      { title: 'Document specific compliance gaps', description: 'Create a detailed record of each compliance gap including the requirement, current state, and severity.', order: 1 },
      { title: 'Share findings with vendor', description: 'Provide the vendor with a formal report of compliance gaps and required remediation actions.', order: 2 },
      { title: 'Request remediation plan with timeline', description: 'Require the vendor to submit a remediation plan with specific actions, owners, and deadlines.', order: 3 },
      { title: 'Monitor remediation progress', description: 'Track vendor progress against the remediation plan with regular check-ins and evidence collection.', order: 4 },
      { title: 'Re-assess compliance after remediation', description: 'Conduct a follow-up audit or assessment to verify all gaps have been adequately addressed.', order: 5 },
    ],
    isSystemProvided: true,
    isActive: true,
  },
  {
    name: 'Emergency Vendor Replacement',
    description:
      'Emergency procedure for rapidly replacing a critical vendor that has experienced a catastrophic failure.',
    category: 'OPERATIONAL' as const,
    triggerCondition: 'Critical vendor failure requiring immediate replacement',
    steps: [
      { title: 'Activate contingency plan', description: 'Invoke the pre-established business continuity plan for the affected vendor category.', order: 1 },
      { title: 'Identify pre-qualified replacement vendors', description: 'Review the approved vendor shortlist and contact potential replacements with emergency requirements.', order: 2 },
      { title: 'Negotiate emergency terms', description: 'Negotiate expedited contracts with acceptable terms, acknowledging the urgency premium if necessary.', order: 3 },
      { title: 'Execute rapid onboarding', description: 'Fast-track the new vendor through an abbreviated onboarding process covering critical integrations.', order: 4 },
      { title: 'Migrate services and data', description: 'Transfer services, data, and configurations from the failed vendor to the replacement.', order: 5 },
      { title: 'Debrief and update contingency plans', description: 'After stabilization, conduct a lessons-learned session and update contingency plans accordingly.', order: 6 },
    ],
    isSystemProvided: true,
    isActive: true,
  },
] as const;
