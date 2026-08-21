# Text substitutions applied to every copied text file.
#
# Real products become a fictional portfolio. Every private product maps to a
# distinct public name so that examples contrasting two products still read
# correctly ("taskflow and riskdesk"), instead of collapsing into nonsense
# ("taskflow and taskflow"). Only `taskflow` actually ships as a demo product;
# the rest are illustrative names used in examples, which the public README
# explains.
#
# Order matters: longer / more specific patterns first.

# --- Slug forms: real product -> fictional product --------------------------
s/quantum-computing-usecases/quantum-explorer/g
s/stablecoin-gateway/taskflow/g
s/qdb-sme-relief/acme-relief/g
s/linkedin-agent/postpilot/g
s/command-center/control-tower/g
s/codeguardian/codesentry/g
s/recomengine/recommendly/g
s/connectgrc/riskdesk/g
s/ai-fluency/skillforge/g
s/muaththir/contentiq/g
s/way2quran/demo-app/g
s/studyflow/learnloop/g
s/archiforge/archstudio/g
s/archforge/archstudio/g
s/connectin/talentgraph/g
s/credit-os/lendcore/g
s/qdb-one/acme-portal/g
s/humanid/openidkit/g
s/CTOaaS AI CTO advisory platform/TaskFlow task tracker/g
s/ctoaas/taskflow/g

# --- Display forms ----------------------------------------------------------
s/Quantum Computing Use Cases/Quantum Explorer/g
s/Stablecoin Gateway/TaskFlow/g
s/StablecoinGateway/TaskFlow/g
s/LinkedIn Agent/PostPilot/g
s/Command Center/Control Tower/g
s/CodeGuardian/CodeSentry/g
s/RecomEngine/Recommendly/g
s/ConnectGRC/RiskDesk/g
s/AI Fluency/SkillForge/g
s/AI-Fluency/SkillForge/g
s/Muaththir/ContentIQ/g
s/StudyFlow/LearnLoop/g
s/ArchForge/ArchStudio/g
s/ConnectIn/TalentGraph/g
s/Credit-OS/LendCore/g
s/Credit OS/LendCore/g
s/QDB-ONE/ACME-PORTAL/g
s/QDB_ONE/ACME_PORTAL/g
s/QDB One/Acme Portal/g
s/QDB-One/Acme Portal/g
s/HumanID/OpenIDKit/g
s/CTOaaS/TaskFlow/g

# --- Real customers, jurisdictions and internal references ------------------
s/Qatar Development Bank/Acme Corp/g
s/Qatar Central Bank/the financial regulator/g
s/Qatar Financial Centre/the financial regulator/g
s/\bQDB\b/Acme/g
s/\bQatari\b/regional/g
s/\bQatar\b/the target market/g
s/the CEO's 130+ team experience at Acme/the CEO's experience running large engineering teams/g

# --- Machine-local paths ----------------------------------------------------
# The private repo hard-codes the founder's laptop path as the install source.
# In the public copy the source is the repo the script itself lives in.
s|SOURCE="\${CONNECTSW_SOURCE:-/Users/tamer/Desktop/Projects/Claude Code creates the SW company}"|SOURCE="${CONNECTSW_SOURCE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." \&\& pwd)}"|

# --- Personal identifiers ---------------------------------------------------
s/ceo: "Tamer"/ceo: "Founder"/g
s/\bTamer\b/Founder/g
s/tamoura@gmail\.com/you@example.com/g
s/\btamoura\b/your-org/g
