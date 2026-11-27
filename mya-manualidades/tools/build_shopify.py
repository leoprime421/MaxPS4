"""Build the Shopify version of the MYA pages.

Run from the mya-manualidades folder:  python3 tools/build_shopify.py

Output (shopify/):
  assets/      files to upload in the theme editor (Edit code -> Assets -> Add a new asset)
  templates/   page.mya-carta.liquid (computer) and page.mya-movil.liquid (phone)
"""
import os
import re
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'shopify')

# local path -> flat Shopify asset name (theme assets cannot live in folders)
ASSETS = {
    'img/mark.png': 'mya-mark.png',
    'img/logo-base.webp': 'mya-logo-base.webp',
    'img/logo-flap.webp': 'mya-logo-flap.webp',
    'img/belen.webp': 'mya-belen.webp',
    'img/collar.webp': 'mya-collar.webp',
    'img/modelo-3d.gltf.json': 'mya-modelo-3d.json',
    'provincias.json': 'mya-provincias.json',
    'lib/three.min.js': 'mya-three.min.js',
    'lib/GLTFLoader.js': 'mya-GLTFLoader.js',
    'lib/OrbitControls.js': 'mya-OrbitControls.js',
    'lib/RoomEnvironment.js': 'mya-RoomEnvironment.js',
}
SPINS = {'img/jose-360/': 8}
for base, n in SPINS.items():
    for k in range(n):
        ASSETS[f'{base}{k}.webp'] = 'mya-' + base.replace('img/', '').strip('/') + f'-{k}.webp'


def url(name):
    return '{{ "%s" | asset_url }}' % name


def convert(src, view_switch):
    s = open(os.path.join(ROOT, src), encoding='utf-8').read()
    assert '{{' not in s and '{%' not in s, f'{src} already contains Liquid tags'
    # longest paths first so 'img/jose-360/0.webp' never half-matches
    for local in sorted((k for k in ASSETS if not k.startswith('img/jose-360/')), key=len, reverse=True):
        s = s.replace(local, url(ASSETS[local]))
    frames = ',\n'.join(
        '    "%s": [%s]' % (base, ', '.join('"%s"' % url(ASSETS[f'{base}{k}.webp']) for k in range(n)))
        for base, n in SPINS.items())
    head = ('<script>\n  window.MYA_SHOPIFY = true;\n'
            '  window.MYA_LOGIN_URL = {{ routes.account_login_url | json }};\n'
            '  window.MYA_LOGOUT_URL = {{ routes.account_logout_url | json }};\n'
            '  window.MYA_ACCOUNT_URL = {{ routes.account_url | json }};\n'
            '  window.MYA_STOREFRONT_LOGIN = {{ routes.storefront_login_url | json }};\n'
            '  window.MYA_CUSTOMER = {% if customer %}{ "id": {{ customer.id | json }}, "name": {{ customer.name | json }}, "email": {{ customer.email | json }} }{% else %}null{% endif %};\n'
            '  window.MYA_FRAMES = {\n__FRAMES__\n  };\n</script>\n').replace('__FRAMES__', frames)
    i = s.index('<title>')
    s = s[:i] + head + s[i:]
    # Formulario de contacto oficial de Shopify (agrega el captcha): reemplaza el formulario manual del Libro de Reclamaciones
    i = s.index('<form id="libroShopForm"')
    j = s.index('</form>', i) + len('</form>')
    block = s[i:j]
    inner = block[block.index('>') + 1:block.rindex('</form>')]
    inner = inner.replace('  <input type="hidden" name="form_type" value="contact">\n', '').replace('  <input type="hidden" name="utf8" value="✓">\n', '')
    s = s[:i] + "{% form 'contact', id: 'libroShopForm', class: 'lr-hidden-form' %}" + inner + '{% endform %}' + s[j:]
    for old, new in view_switch:
        assert old in s, (src, old)
        s = s.replace(old, new)
    # Scripts de Shopify (incluye el captcha de los formularios); obligatorio en plantillas con layout none
    k = s.index('<meta name="viewport"')
    k = s.index('>', k) + 1
    s = s[:k] + '\n{{ content_for_header }}' + s[k:]
    return '{% layout none %}\n' + s


def main():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, 'assets'))
    os.makedirs(os.path.join(OUT, 'templates'))
    for local, name in ASSETS.items():
        shutil.copyfile(os.path.join(ROOT, local), os.path.join(OUT, 'assets', name))
    carta = convert('carta.html', [
        ("location.replace('movil.html'+location.hash)",
         "location.replace(location.pathname+'?view=mya-movil'+location.hash)"),
    ])
    movil = convert('movil.html', [
        ("location.replace('carta.html'+location.hash)",
         "location.replace(location.pathname+location.hash)"),
    ])
    open(os.path.join(OUT, 'templates', 'page.mya-carta.liquid'), 'w', encoding='utf-8').write(carta)
    open(os.path.join(OUT, 'templates', 'page.mya-movil.liquid'), 'w', encoding='utf-8').write(movil)
    left = re.findall(r'["\'`(](?:img|lib)/[^"\'`)]+', carta + movil)
    left = [x for x in left if 'jose-360/' not in x]
    assert not left, f'unconverted paths: {left}'
    print(f'{len(ASSETS)} assets, 2 templates -> {OUT}')


if __name__ == '__main__':
    main()
