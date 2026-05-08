"""
Fetches macroeconomic series and writes public/macro-data.json.

IPCA   - BCB SGS 433   (variação mensal %, fonte: IBGE via BCB)
SELIC  - BCB SGS 4189  (acumulada no mês, anualizada base 252, % a.a.)
IGP-M  - BCB SGS 189   (variação mensal %, fonte: FGV via BCB)
TJLP   - BCB SGS 4175  (taxa % a.m., fim de período)
PTAX   - BCB SGS 1     (R$/USD, fim de período — limitado a 2010+)
CPI-US - BLS CUUR0000SA0 (All items, not seasonally adjusted)
"""

import json, os, sys, urllib.request, urllib.error
from collections import defaultdict
from datetime import datetime, timezone

OUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'public', 'macro-data.json')
TIMEOUT  = 90  # seconds — séries diárias do BCB podem ser grandes


# ── helpers ──────────────────────────────────────────────────────────────────

def get_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'macro-dashboard/1.0'})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return json.loads(r.read().decode())


def to_monthly_last(rows):
    """Daily or monthly BCB rows → last value of each calendar month."""
    monthly = {}
    for row in rows:
        try:
            d, m, y = row['data'].split('/')
            valor = row.get('valor', '').strip()
            if not valor or valor in ('null', 'None'):
                continue
            val = float(valor.replace(',', '.'))
            monthly[(int(y), int(m))] = val
        except Exception:
            continue
    return [{'year': y, 'month': m, 'value': v}
            for (y, m), v in sorted(monthly.items())]


def fetch_bcb(code, label, start='01/01/2000'):
    url = (f'https://api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados'
           f'?formato=json&dataInicial={start}')
    print(f'  BCB SGS {code} ({label})...', end=' ', flush=True)
    try:
        data = get_json(url)
        if not isinstance(data, list):
            print('resposta inesperada')
            return []
        print(f'{len(data)} pontos')
        return data
    except Exception as e:
        print(f'ERRO: {e}')
        return []


# ── BLS CPI-US ───────────────────────────────────────────────────────────────

def fetch_cpi_us():
    series_id   = 'CUUR0000SA0'
    current_year = datetime.now().year
    all_rows     = {}

    print('  BLS CPI-US...', end=' ', flush=True)
    for start in range(2005, current_year + 1, 3):
        end = min(start + 2, current_year)
        url = (f'https://api.bls.gov/publicAPI/v1/timeseries/data/{series_id}'
               f'?startyear={start}&endyear={end}')
        try:
            resp = get_json(url)
            for s in resp.get('Results', {}).get('series', []):
                for pt in s.get('data', []):
                    period = pt.get('period', '')
                    if not period.startswith('M') or period == 'M13':
                        continue
                    y = int(pt['year'])
                    m = int(period[1:])
                    all_rows[(y, m)] = float(pt['value'])
        except Exception as e:
            print(f'[{start}-{end}: {e}]', end=' ')

    rows = [{'year': y, 'month': m, 'value': v}
            for (y, m), v in sorted(all_rows.items())]
    print(f'{len(rows)} pontos')
    return rows


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    print('Buscando dados macro...')

    # Séries mensais — rápidas
    ipca_raw  = fetch_bcb(433,  'IPCA mensal %')
    selic_raw = fetch_bcb(4189, 'SELIC acum. mês anualiz.')
    igpm_raw  = fetch_bcb(189,  'IGP-M mensal %')
    tjlp_raw  = fetch_bcb(4175, 'TJLP')

    # Séries diárias — limitadas a 2010+ para evitar timeout
    ptax_raw  = fetch_bcb(1, 'PTAX R$/USD', start='01/01/2010')

    # BLS (batches de 3 anos)
    cpi_raw   = fetch_cpi_us()

    result = {
        'updated': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'series': {
            'ipca':   to_monthly_last(ipca_raw),
            'selic':  to_monthly_last(selic_raw),
            'igpm':   to_monthly_last(igpm_raw),
            'tjlp':   to_monthly_last(tjlp_raw),
            'ptax':   to_monthly_last(ptax_raw),
            'cpi_us': cpi_raw,
        },
    }

    counts = {k: len(v) for k, v in result['series'].items()}
    print('Pontos por série:', counts)

    os.makedirs(os.path.dirname(os.path.abspath(OUT_PATH)), exist_ok=True)
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, separators=(',', ':'))
    print(f'Salvo → {OUT_PATH}')

    total = sum(counts.values())
    if total == 0:
        print('ERRO: nenhuma série retornou dados.', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
