import base64
from collections import defaultdict
from datetime import date
from decimal import Decimal
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

_TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
_CHART_COLORS = [
    "#4a90d9", "#4caf50", "#ff9800", "#e91e63", "#9c27b0",
    "#00bcd4", "#ff5722", "#607d8b",
]


def _category_svg_chart(by_category: dict, total: Decimal) -> str:
    if not total:
        return ""
    bar_h, bar_w, padding, label_w = 18, 280, 4, 120
    items = list(by_category.items())
    svg_h = len(items) * (bar_h + padding) + padding
    rows = []
    for i, (cat, exps) in enumerate(items):
        cat_total = sum(float(e.total_amount) for e in exps)
        w = max(1, int(bar_w * cat_total / float(total)))
        y = i * (bar_h + padding) + padding
        color = _CHART_COLORS[i % len(_CHART_COLORS)]
        rows.append(
            f'<text x="0" y="{y + 13}" font-size="10" fill="#333">{cat[:18]}</text>'
            f'<rect x="{label_w}" y="{y}" width="{w}" height="{bar_h}" fill="{color}"/>'
            f'<text x="{label_w + w + 4}" y="{y + 13}" font-size="9" fill="#555">'
            f'R$ {cat_total:.2f}</text>'
        )
    return (
        f'<svg class="chart" width="{label_w + bar_w + 80}" height="{svg_h}" '
        f'xmlns="http://www.w3.org/2000/svg">{"".join(rows)}</svg>'
    )


def generate_pdf_with_images(
    expenses: list,
    from_date: date,
    to_date: date,
    receipt_image_map: dict,
) -> bytes:
    total = sum(e.total_amount for e in expenses) or Decimal("0")

    by_category: dict = defaultdict(list)
    for e in expenses:
        by_category[e.category or "Outros"].append(e)

    receipt_images = []
    for e in expenses:
        if e.receipt_id and str(e.receipt_id) in receipt_image_map:
            img_b64 = base64.standard_b64encode(
                receipt_image_map[str(e.receipt_id)]
            ).decode("utf-8")
            receipt_images.append({
                "vendor": e.vendor,
                "date": e.date,
                "total_amount": e.total_amount,
                "image_b64": img_b64,
            })

    period_label = f"{from_date.strftime('%d/%m/%Y')} – {to_date.strftime('%d/%m/%Y')}"
    env = Environment(loader=FileSystemLoader(str(_TEMPLATES_DIR)), autoescape=False)
    html_str = env.get_template("report.html").render(
        period_label=period_label,
        total_amount=total,
        expense_count=len(expenses),
        by_category=dict(by_category),
        receipt_images=receipt_images,
        category_chart=_category_svg_chart(by_category, total),
    )
    return HTML(string=html_str).write_pdf()
