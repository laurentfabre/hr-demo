"""Assemble docs/index.html from the Socomec site template CSS + guide body.

Usage: python3 docs/src/build.py <path-to-socomec-gateway-site/index.html>
"""
import pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parent
template = pathlib.Path(sys.argv[1]).read_text()
css = template[template.index('<style>') + 7:template.index('</style>')]
css = css[:css.index('/* benchmark type badges */')]  # drop page-specific bench + inline password gate
logo = re.search(r'class="dbx" src="(data:image/svg\+xml;base64,[^"]+)"', template).group(1)
extra = (HERE / 'guide.extra.css').read_text()
body = (HERE / 'guide.body.html').read_text().replace('__DBX_LOGO__', logo)
head = (HERE / 'guide.head.html').read_text()
script = (HERE / 'guide.script.html').read_text()
out = HERE.parent / 'index.html'
out.write_text(head + '<style>' + css + extra + '</style>\n</head>\n<body>\n' + body + script + '\n</body>\n</html>\n')
print(out, out.stat().st_size)
