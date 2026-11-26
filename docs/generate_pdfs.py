#!/usr/bin/env python3
import os
import subprocess
import markdown

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{title}</title>
  <style>
    @page {{
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
      @bottom-right {{
        content: counter(page);
      }}
    }}
    *, *::before, *::after {{
      box-sizing: border-box;
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.55;
      color: #2B1E1A;
      background-color: #FAF5EB;
      margin: 0;
      padding: 24px;
    }}
    .document-header {{
      border-bottom: 2px solid #A8793E;
      padding-bottom: 12px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }}
    .brand-title {{
      font-family: Georgia, "Times New Roman", serif;
      font-size: 20pt;
      font-weight: bold;
      color: #7A231E;
      margin: 0;
      letter-spacing: 0.5px;
    }}
    .doc-meta {{
      font-size: 8.5pt;
      color: #6E5A52;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }}
    h1 {{
      font-family: Georgia, "Times New Roman", serif;
      color: #7A231E;
      font-size: 18pt;
      margin-top: 24px;
      margin-bottom: 12px;
      border-bottom: 1px solid #E5D5C0;
      padding-bottom: 6px;
      page-break-after: avoid;
    }}
    h2 {{
      font-family: Georgia, "Times New Roman", serif;
      color: #7A231E;
      font-size: 14pt;
      margin-top: 20px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }}
    h3 {{
      font-family: Georgia, "Times New Roman", serif;
      color: #A8793E;
      font-size: 11.5pt;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }}
    p, li {{
      color: #2B1E1A;
      margin-top: 4px;
      margin-bottom: 8px;
    }}
    ul, ol {{
      padding-left: 20px;
      margin-top: 4px;
      margin-bottom: 12px;
    }}
    li {{
      margin-bottom: 4px;
    }}
    strong {{
      color: #1A110E;
    }}
    code {{
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
      font-size: 9pt;
      background-color: #F0E6D2;
      color: #7A231E;
      padding: 1.5px 5px;
      border-radius: 4px;
      border: 1px solid #DECBB1;
    }}
    pre {{
      background-color: #2B1E1A;
      color: #F5EFEB;
      padding: 12px 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 8.5pt;
      line-height: 1.45;
      margin: 12px 0;
      page-break-inside: avoid;
    }}
    pre code {{
      background-color: transparent;
      color: inherit;
      padding: 0;
      border: none;
      font-size: inherit;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 9pt;
      page-break-inside: avoid;
      background-color: #FFFDF9;
      border: 1px solid #E2D1BA;
      border-radius: 6px;
      overflow: hidden;
    }}
    th {{
      background-color: #7A231E;
      color: #FFFDF9;
      font-weight: 600;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #661D19;
      letter-spacing: 0.3px;
    }}
    td {{
      padding: 7px 10px;
      border: 1px solid #EADBCE;
      color: #2B1E1A;
      vertical-align: top;
    }}
    tr:nth-child(even) td {{
      background-color: #FBF7F0;
    }}
    blockquote {{
      border-left: 3.5px solid #A8793E;
      background-color: #F3EBDD;
      margin: 12px 0;
      padding: 8px 14px;
      font-style: italic;
      color: #4A3A34;
      border-radius: 0 6px 6px 0;
    }}
    hr {{
      border: none;
      border-top: 1px solid #DECBB1;
      margin: 20px 0;
    }}
    a {{
      color: #7A231E;
      text-decoration: underline;
    }}
  </style>
</head>
<body>
  <div class="document-header">
    <div>
      <div class="brand-title">AnuVarnika Sarees</div>
      <div style="font-size: 9pt; color: #7A231E; font-weight: 500;">Handcrafted Heritage Drapes &amp; Pure Silk Weaves</div>
    </div>
    <div class="doc-meta">Official Documentation</div>
  </div>
  {content}
</body>
</html>
"""

DOCS = [
    (
        "docs/USER_AND_ADMIN_FLOW.md",
        "docs/AnuVarnika-Client-and-Admin-Flow.pdf",
        "AnuVarnika Sarees — Customer & Admin Lifecycle Guide",
    ),
    (
        "docs/DEVELOPER_GUIDE.md",
        "docs/AnuVarnika-Developer-and-Environment-Guide.pdf",
        "AnuVarnika Sarees — Developer & Environment Architecture Guide",
    ),
    (
        "docs/CLIENT_HANDOVER_AND_DEPLOYMENT_REQUIREMENTS.md",
        "docs/AnuVarnika-Client-Handover-and-Deployment-Checklist.pdf",
        "AnuVarnika Sarees — Client Handover & Deployment Checklist",
    ),
]

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root_dir)

    md_parser = markdown.Markdown(extensions=["extra", "tables", "codehilite", "toc"])

    for md_rel, pdf_rel, doc_title in DOCS:
        md_path = os.path.join(root_dir, md_rel)
        pdf_path = os.path.join(root_dir, pdf_rel)
        tmp_html_path = md_path + ".tmp.html"

        print(f"Converting {md_rel} -> {pdf_rel}...")

        with open(md_path, "r", encoding="utf-8") as f:
            md_text = f.read()

        html_body = md_parser.convert(md_text)
        md_parser.reset()

        full_html = HTML_TEMPLATE.format(title=doc_title, content=html_body)

        with open(tmp_html_path, "w", encoding="utf-8") as f:
            f.write(full_html)

        cmd = [
            "/usr/bin/google-chrome",
            "--headless",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_path}",
            tmp_html_path,
        ]

        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            print(f"Error compiling {pdf_rel}: {res.stderr}")
        else:
            size_kb = os.path.getsize(pdf_path) / 1024
            print(f"Successfully generated {pdf_rel} ({size_kb:.1f} KB)")

        if os.path.exists(tmp_html_path):
            os.remove(tmp_html_path)

if __name__ == "__main__":
    main()
