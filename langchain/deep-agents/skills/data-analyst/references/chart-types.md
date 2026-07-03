# Chart selection guide

Use the default charts from `run_data_analysis` unless the user specifies otherwise.

| Data shape | Default chart | When to mention |
|------------|---------------|-----------------|
| Single numeric column | Histogram | Distribution, outliers |
| Two numeric columns | Scatter plot | Correlation |
| Categorical column | Bar chart (top 10) | Frequency breakdown |

If the user asks for time series, note that the bundled script uses column types automatically.
For custom charts, write a one-off script via `code-generator` instead of editing `analyze.py`.
