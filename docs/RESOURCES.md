# Rukh ENT legal constraints and resources

The legal and regulatory constraints a classroom AI assistant must meet in French schools, how Rukh meets each one, and reference resources.

## Why these constraints

The French Ministry of Education's [cadre d'usage de l'IA en éducation](https://www.education.gouv.fr/cadre-d-usage-de-l-ia-en-education-450647) (June 2025) sets two constraints that consumer AI services don't meet:

- « Il ne faut en aucun cas demander aux élèves de se créer un compte personnel auprès de services d'IA. »
- Consumer services « ne garantissent pas la non-réutilisation des données saisies ».

On top of that, no student personal data may pass through the assistant ([GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj) data minimisation principle). The teacher keeps control of the scope: the AI assists, and replaces neither the teacher's professional judgement nor the student's own intellectual effort.

So Rukh is an assistant with no student account, a scope set by the teacher, and no stored messages. In Rukh ENT, students sign in through the ENT they already use, so they still never create an account.

## Requirements

| Requirement | Source | Rukh's answer |
| --- | --- | --- |
| No personal student account | Cadre d'usage | Access by link, no student authentication (Rukh ENT: ENT identity only) |
| Data minimisation, no personal data | GDPR art. 5 | Masking in the browser, raw message never stored |
| History and model improvement off by default | [CNIL](https://www.cnil.fr/fr/intelligence-artificielle) | Message content is never kept |
| No transfer outside the EU/EEA | GDPR chapter V | Inference hosted in the EU, whatever model the teacher picks |
| Transparency: users know they are talking to an AI | [AI Act](https://eur-lex.europa.eu/eli/reg/2024/1689/oj) art. 50 | Explicit interface, answers attributed to the assistant |
| No emotion recognition at school | AI Act art. 5 | No analysis of attention, engagement or expression |
| Frugal use, free software preferred | Cadre d'usage | Open source code ([rukh-ui](https://github.com/w3hc/rukh-ui), [rukh](https://github.com/w3hc/rukh)), an open model available ([Mistral](https://mistral.ai/)), a scope that limits web calls |
| AI supervised by the teacher, not a substitute | Cadre d'usage | The teacher sets the corpus, scope, model and allowed exercises |

Sources: Cadre d'usage de l'IA en éducation (MENJ, June 2025), CNIL, GDPR, AI Act (Regulation (EU) 2024/1689).

## Resources

- [L'école peut-elle survivre à l'IA ?](https://youtu.be/PyreD4605dQ), talk by [Philippe Meirieu](https://fr.wikipedia.org/wiki/Philippe_Meirieu)
- [L'IA en éducation : cadre d'usage](https://www.education.gouv.fr/cadre-d-usage-de-l-ia-en-education-450647), French Ministry of Education, June 2025
- [Rukh source code](https://github.com/w3hc/rukh)
- [Rukh demo video](https://youtu.be/5NGApe0T2Ao)
- [Example classroom activities](https://julienberanger.com/ia-exemples-d-activites)
