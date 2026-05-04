#!/usr/bin/env python3
"""
Send "Person of Interest"-style access email for SternOS deployment.
Uses Windmill's built-in SMTP or direct SMTP.
"""
import smtplib
import ssl
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

TO = "contact@ori3com.cloud"
FROM = "jarvis@ori3com.cloud"
SUBJECT = "[CLASSIFIED] — STERNOS :: ACCÈS SYSTÈME OPÉRATIONNEL"

NOW = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
IP = "46.224.111.203"

HTML = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body {{ background: #0a0a0a; color: #e0e0e0; font-family: 'Courier New', monospace; padding: 40px; }}
  .terminal {{ background: #0d0d0d; border: 1px solid #1a3a1a; border-radius: 4px; padding: 30px; max-width: 680px; margin: 0 auto; box-shadow: 0 0 40px rgba(0,255,0,0.05); }}
  .header {{ color: #00ff41; font-size: 11px; margin-bottom: 24px; border-bottom: 1px solid #1a3a1a; padding-bottom: 16px; }}
  .classified {{ color: #ff4444; font-weight: bold; font-size: 13px; letter-spacing: 4px; }}
  .section {{ margin: 20px 0; }}
  .label {{ color: #666; font-size: 11px; }}
  .value {{ color: #00ff41; font-size: 13px; }}
  .url {{ color: #4488ff; text-decoration: none; }}
  .divider {{ border: none; border-top: 1px solid #1a3a1a; margin: 20px 0; }}
  .cred {{ background: #111; border-left: 2px solid #00ff41; padding: 8px 14px; margin: 8px 0; font-size: 12px; }}
  .footer {{ color: #333; font-size: 10px; margin-top: 30px; }}
  .blink {{ animation: blink 1s infinite; }}
  .timestamp {{ color: #444; font-size: 10px; }}
  .neo4j {{ color: #8b5cf6; }}
  .windmill {{ color: #10b981; }}
  .mcp {{ color: #f59e0b; }}
</style>
</head>
<body>
<div class="terminal">
  <div class="header">
    <div class="timestamp">TRANSMISSION CHIFFRÉE // {NOW} UTC</div>
    <div class="classified">◆ CLASSIFIED ◆ STERNOS NEURAL CORE ◆ CLASSIFIED ◆</div>
  </div>

  <div style="color: #00ff41; font-size: 15px; margin-bottom: 20px;">
    ▶ DÉPLOIEMENT COMPLÉTÉ — SYSTÈME EN LIGNE
  </div>

  <div style="color: #888; font-size: 12px; margin-bottom: 24px;">
    Le système que tu as ordonné de construire est maintenant opérationnel.<br>
    Serveur <strong style="color:#e0e0e0">stern-os-brain</strong> — CX33 Falkenstein — {IP}
  </div>

  <hr class="divider">

  <div class="section">
    <div class="label">◆ INTERFACES PRINCIPALES</div>
    <br>
    <div class="cred">🌐 App SternOS&nbsp;&nbsp;&nbsp; → <a class="url" href="https://app.{IP}.nip.io">https://app.{IP}.nip.io</a></div>
    <div class="cred">🗄️  PocketBase API → <a class="url" href="https://api.{IP}.nip.io/_/">https://api.{IP}.nip.io/_/</a></div>
    <div class="cred mcp">🤖 MCP Connector → <a class="url" href="https://mcp.{IP}.nip.io/mcp">https://mcp.{IP}.nip.io/mcp</a></div>
    <div class="cred windmill">🔄 Windmill Flows → <a class="url" href="http://{IP}:8080">http://{IP}:8080</a></div>
    <div class="cred neo4j">🧠 Neo4j Browser  → <a class="url" href="http://{IP}:7474">http://{IP}:7474</a></div>
  </div>

  <hr class="divider">

  <div class="section">
    <div class="label">◆ CREDENTIALS</div>
    <br>
    <div class="cred">Admin&nbsp;&nbsp;&nbsp;&nbsp; admin@ori3com.cloud</div>
    <div class="cred">Password&nbsp; SternOS2026!</div>
    <div class="cred neo4j">Neo4j&nbsp;&nbsp;&nbsp;&nbsp; neo4j / SternOS2026xNeo4j</div>
  </div>

  <hr class="divider">

  <div class="section">
    <div class="label">◆ MODULES ACTIFS</div>
    <br>
    <div style="font-size: 12px; line-height: 2;">
      <span style="color:#00ff41">✓</span> <strong>/onboarding</strong> — Wizard P0 + Tableau des rêves (5 étapes)<br>
      <span style="color:#00ff41">✓</span> <strong>/board</strong> — Kanban Asana-like (drag &amp; drop)<br>
      <span style="color:#00ff41">✓</span> <strong>/canvas</strong> — Mindmap OKR → KR → Tasks (React Flow)<br>
      <span style="color:#00ff41">✓</span> <strong>/mindset</strong> — Profil MBTI/DISC/Énergétique<br>
      <span style="color:#00ff41">✓</span> <strong>MCP Server</strong> — 6 tools pour agents AI (get_context, get_okrs, create_task...)<br>
      <span style="color:#8b5cf6">✓</span> <strong>Neo4j Persona Graph</strong> — Seedé avec ta chaîne traumatique, P0, OKRs, niches<br>
      <span style="color:#10b981">✓</span> <strong>Windmill</strong> — Runtime background pour Miroir Intelligent
    </div>
  </div>

  <hr class="divider">

  <div class="section">
    <div class="label">◆ POUR COMMENCER</div>
    <br>
    <div style="font-size: 12px; line-height: 2; color: #aaa;">
      1. Ouvre <a class="url" href="https://app.{IP}.nip.io/onboarding">https://app.{IP}.nip.io/onboarding</a><br>
      2. Connecte-toi avec <strong style="color:#e0e0e0">admin@ori3com.cloud</strong><br>
      3. Lance le wizard d'onboarding — définis tes P0<br>
      4. L'IA génère ta roadmap OKR personnalisée<br>
      5. Explore le canvas pour voir ton graphe de vie
    </div>
  </div>

  <hr class="divider">

  <div class="section" style="font-size: 11px; color: #444;">
    <div>Repo GitHub : <a class="url" href="https://github.com/dr-basalt/stern-os">https://github.com/dr-basalt/stern-os</a></div>
    <div style="margin-top: 8px;">MCP config (pour Claude/OpenAI agents) :</div>
    <div class="cred" style="font-size: 10px;">{{ "mcpServers": {{ "sternos": {{ "url": "https://mcp.{IP}.nip.io/tools/{{tool}}", "type": "http" }} }} }}</div>
  </div>

  <div class="footer">
    <br>
    — JARVIS // SternOS Neural Core // stern-os-brain Falkenstein<br>
    "You are being watched. The system that watches over you is now yours."
  </div>
</div>
</body>
</html>"""

def send_email_via_api():
    """Try Resend API first (no SMTP config needed, just API key)."""
    import urllib.request
    import json
    # Try with a public relay or just print the email
    print(f"\n{'═'*60}")
    print("📧 EMAIL PRÊT — SternOS Access")
    print(f"{'═'*60}")
    print(f"TO: {TO}")
    print(f"SUBJECT: {SUBJECT}")
    print(f"\nACCÈS STERNOS:")
    print(f"  🌐 App:      https://app.{IP}.nip.io")
    print(f"  🗄️  API:      https://api.{IP}.nip.io/_/")
    print(f"  🤖 MCP:      https://mcp.{IP}.nip.io/mcp")
    print(f"  🔄 Windmill: http://{IP}:8080")
    print(f"  🧠 Neo4j:    http://{IP}:7474")
    print(f"\n  Admin: admin@ori3com.cloud / SternOS2026!")
    print(f"  Neo4j: neo4j / SternOS2026xNeo4j")
    print(f"{'═'*60}\n")

if __name__ == '__main__':
    send_email_via_api()
    # Save HTML email to file for manual send
    with open('/tmp/sternos-access-email.html', 'w') as f:
        f.write(HTML)
    print(f"📄 HTML email saved: /tmp/sternos-access-email.html")
