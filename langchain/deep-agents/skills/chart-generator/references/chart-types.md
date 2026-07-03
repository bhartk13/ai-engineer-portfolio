# Chart type selection

## sample_sales.csv columns

`month`, `product`, `units`, `revenue`

Recommended call for sales dashboards:

```text
chart_type=dual_line
x_column=month
y_column=revenue
y_column_2=units
group_by=product
```

## Auto-detection

If `x_column` or `y_column` are omitted, the script picks:

- X: first non-numeric column
- Y: first numeric column
- Y2 (dual_line): second numeric column

## Output location

Default: `/workspace/charts/<csv-stem>_<chart_type>.png`

Override with `output_file=/workspace/charts/my_chart.png`.
