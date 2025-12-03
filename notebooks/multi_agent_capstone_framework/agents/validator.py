class ValidatorAgent:
    def __init__(self, memory):
        self.memory = memory

    def validate(self, session_id: str, results: dict):
        issues = []
        requires_human = False
        for s in results.get('steps', []):
            out = s.get('output', {})
            if isinstance(out, dict) and out.get('error'):
                issues.append(f"step {s.get('id')} reported error")
                requires_human = True
        if len(results.get('steps', [])) == 0:
            issues.append('no steps executed')
            requires_human = True
        return {'issues': issues, 'requires_human_review': requires_human}
