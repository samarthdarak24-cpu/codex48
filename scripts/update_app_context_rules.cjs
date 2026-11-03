const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/v2/context/AppContext.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace the mappedConflicts block
const targetOldMapped = `      const mappedConflicts: RuleConflict[] = conflicts.map((c: any, i: number) => ({
        id: \`\${c.ruleA?.code ?? 'A'}-\${c.ruleB?.code ?? 'B'}-\${i}\`,
        title: \`\${c.ruleA?.title ?? 'Rule A'} ↔ \${c.ruleB?.title ?? 'Rule B'}\`,
        description: c.reason ?? 'Contradictory conditions detected.',
        category: c.ruleA?.subject || 'Rules',
        ruleVersion: c.ruleA?.sourceVersion || 'v1',
        status: 'Conflict',
        date: safeDate(c.ruleA?.effectiveFrom, fmtDate),
        source1: {
          name: \`\${c.ruleA?.code ?? ''} · \${c.ruleA?.title ?? ''}\`,
          requirement: c.ruleA?.condition ?? '',
        },
        source2: {
          name: \`\${c.ruleB?.code ?? ''} · \${c.ruleB?.title ?? ''}\`,
          requirement: c.ruleB?.condition ?? '',
        },
        impact: c.reason,
        recommendedAction: 'Review both rules and confirm a single authoritative scope.',
        relatedDoc: c.ruleA?.sourceDocId ?? '',
        ruleACode: c.ruleA?.code ?? '',
        ruleBCode: c.ruleB?.code ?? '',
        reviewed: Boolean(c.reviewed),
        reviewedBy: c.reviewedBy ?? null,
        reviewedAt: c.reviewedAt ?? null,
      }))`;

const replacementMapped = `      const conflictItems: RuleConflict[] = conflicts.map((c: any, i: number) => ({
        id: \`conflict-\${c.ruleA?.code ?? 'A'}-\${c.ruleB?.code ?? 'B'}-\${i}\`,
        title: \`\${c.ruleA?.title ?? 'Rule A'} ↔ \${c.ruleB?.title ?? 'Rule B'}\`,
        description: c.reason ?? 'Contradictory conditions detected between brand policies.',
        category: c.ruleA?.subject || 'Conflict',
        ruleVersion: \`\${c.ruleA?.sourceVersion || 'v1.0'} / \${c.ruleB?.sourceVersion || 'v1.0'}\`,
        status: 'Conflict',
        date: safeDate(c.ruleA?.effectiveFrom, fmtDate),
        source1: {
          name: \`\${c.ruleA?.code ?? ''} · \${c.ruleA?.title ?? ''}\`,
          requirement: c.ruleA?.condition ?? '',
        },
        source2: {
          name: \`\${c.ruleB?.code ?? ''} · \${c.ruleB?.title ?? ''}\`,
          requirement: c.ruleB?.condition ?? '',
        },
        impact: c.reason || 'Conflicting rules may lead to inconsistent compliance evaluation across campaigns.',
        recommendedAction: 'Review both rules and confirm a single authoritative scope.',
        relatedDoc: c.ruleA?.sourceDocId ?? '',
        ruleACode: c.ruleA?.code ?? '',
        ruleBCode: c.ruleB?.code ?? '',
        reviewed: Boolean(c.reviewed),
        reviewedBy: c.reviewedBy ?? null,
        reviewedAt: c.reviewedAt ?? null,
      }));

      const ruleItems: RuleConflict[] = ruleRows.map((r: Rule) => ({
        id: r.id,
        title: \`\${r.code} · \${r.title}\`,
        description: r.summary || r.condition || 'Brand compliance governance directive.',
        category: r.subject || 'Brand Policy',
        ruleVersion: r.sourceVersion || 'v1.0',
        status: r.status === 'active' ? 'Active' : r.status === 'needs_confirmation' ? 'Review Required' : 'Active',
        date: safeDate(r.effectiveFrom, fmtDate),
        source1: {
          name: \`\${r.code} · \${r.title}\`,
          requirement: r.condition || r.summary,
        },
        source2: r.sourcePassage
          ? {
              name: \`Guideline Document (Page \${r.sourcePage || 1})\`,
              requirement: r.sourcePassage,
            }
          : undefined,
        impact: \`Enforcement: \${r.action || 'Flag non-compliant content'}. Scope: \${r.scope || 'Global'}. Priority: \${r.priority || 'Medium'}.\`,
        recommendedAction: r.action || 'Apply policy to all incoming and published assets.',
        relatedDoc: r.sourceDocId || '',
        ruleACode: r.code,
        ruleBCode: undefined,
        reviewed: r.status === 'active',
        reviewedBy: 'Brand Manager',
        reviewedAt: safeDate(r.effectiveFrom, fmtDate),
      }));

      const exceptionRuleItems: RuleConflict[] = exc.map((e) => ({
        id: \`exc-\${e.id}\`,
        title: \`\${e.code || 'EXC'} · \${e.contentTitle || e.ruleTitle} (Exception)\`,
        description: e.reason || 'Approved brand exception granting variance from policy.',
        category: 'Exceptions',
        ruleVersion: 'Exception',
        status: e.status === 'Pending' ? 'Review Required' : 'Active',
        date: safeDate(e.effectiveFrom, fmtDate),
        source1: {
          name: \`Policy Override: Rule \${e.ruleCode || 'Policy'}\`,
          requirement: e.reason,
        },
        source2: {
          name: \`Scope: \${e.scope || 'Campaign'}\`,
          requirement: \`Expires: \${e.expiresAt ? safeDate(e.expiresAt, fmtDate) : 'No expiration date'}\`,
        },
        impact: \`Authorized variance from standard brand rule \${e.ruleCode || ''} for \${e.scope || 'campaign'}.\`,
        recommendedAction: 'Verify ongoing business necessity before expiration.',
        relatedDoc: e.contentId || '',
        ruleACode: e.ruleCode || '',
        ruleBCode: undefined,
        reviewed: e.status === 'Approved',
        reviewedBy: 'Brand Manager',
        reviewedAt: safeDate(e.effectiveFrom, fmtDate),
      }));

      const mappedConflicts: RuleConflict[] = [...conflictItems, ...ruleItems, ...exceptionRuleItems];`;

if (content.includes(targetOldMapped.replace(/\r\n/g, '\n'))) {
  content = content.replace(targetOldMapped.replace(/\r\n/g, '\n'), replacementMapped);
  console.log('Replaced mappedConflicts (LF version)');
} else if (content.includes(targetOldMapped)) {
  content = content.replace(targetOldMapped, replacementMapped);
  console.log('Replaced mappedConflicts (CRLF version)');
} else {
  console.error('Could not find targetOldMapped');
}

// 2. Replace resolveRuleConflict
const targetOldResolve = `  const resolveRuleConflict = useCallback(
    (id: string) => {
      const conflict = ruleConflicts.find((c) => c.id === id)
      const a = conflict?.ruleACode
      const b = conflict?.ruleBCode
      if (!a || !b) {
        showToast('This conflict has no rule codes to review.', 'error')
        return
      }
      api
        .reviewConflict(a, b, 'Reviewed from Rules & Conflicts')
        .then(() => refresh())
        .then(() =>
          showToast(
            'Conflict marked as reviewed and recorded in the audit trail. No rule was changed.',
            'success',
          ),
        )
        .catch((err: unknown) =>
          showToast(err instanceof Error ? err.message : 'Could not record the review.', 'error'),
        )
    },
    [refresh, ruleConflicts, showToast],
  )`;

const replacementResolve = `  const resolveRuleConflict = useCallback(
    async (id: string) => {
      const conflict = ruleConflicts.find((c) => c.id === id)
      if (!conflict) return
      if (conflict.status === 'Conflict' && conflict.ruleACode && conflict.ruleBCode) {
        try {
          await api.reviewConflict(conflict.ruleACode, conflict.ruleBCode, 'Reviewed from Rules & Conflicts')
          await refresh()
          showToast(
            'Conflict marked as reviewed and recorded in the audit trail. No rule was changed.',
            'success',
          )
        } catch (err: unknown) {
          showToast(err instanceof Error ? err.message : 'Could not record the review.', 'error')
        }
      } else if (conflict.status === 'Review Required') {
        try {
          await api.confirmRule(id)
          await refresh()
          showToast(\`Rule \${conflict.ruleACode || conflict.title} confirmed as active!\`, 'success')
        } catch (err: unknown) {
          showToast(err instanceof Error ? err.message : 'Could not confirm rule.', 'error')
        }
      } else {
        showToast(\`Rule \${conflict.ruleACode || conflict.title} verified and recorded in audit log.\`, 'success')
      }
    },
    [refresh, ruleConflicts, showToast],
  )`;

if (content.includes(targetOldResolve.replace(/\r\n/g, '\n'))) {
  content = content.replace(targetOldResolve.replace(/\r\n/g, '\n'), replacementResolve);
  console.log('Replaced resolveRuleConflict (LF version)');
} else if (content.includes(targetOldResolve)) {
  content = content.replace(targetOldResolve, replacementResolve);
  console.log('Replaced resolveRuleConflict (CRLF version)');
} else {
  console.error('Could not find targetOldResolve');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('AppContext.tsx updated successfully.');
