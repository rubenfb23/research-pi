# DeepSeek V4.1 Flash vs GLM-5.3 Flash

Comparison prepared October 5, 2026 from two retained runs on October 4. Both models used OpenCode Go, the same seven task definitions, three controlled SDK profiles and exactly matching requested effort, temperature and budgets. Local frozen task definitions and settings were checked for equality before this comparison. There were 21 attempts per model, one session per task/profile. GLM-5.3 without the Flash suffix was not tested.

## Quality by scenario

Values are percentages of the frozen task rubric, not success probabilities or scientific expertise scores. Every attempt, including budget failures, is included.

| Scenario | Pi: DeepSeek | Pi: GLM | ResearchPi without scientific tools: DeepSeek | Same: GLM | ResearchPi with scientific tools: DeepSeek | Same: GLM |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Prediction metrics | 100.0% | 0.0% | 100.0% | 0.0% | 100.0% | 0.0% |
| Seed coverage | 66.7% | 66.7% | 66.7% | 0.0% | 66.7% | 0.0% |
| Data leakage | 100.0% | 0.0% | 100.0% | 100.0% | 100.0% | 100.0% |
| Paired uncertainty | 100.0% | 0.0% | 75.0% | 100.0% | 100.0% | 0.0% |
| Causal claim | 100.0% | 0.0% | 100.0% | 0.0% | 100.0% | 0.0% |
| Source synthesis | 100.0% | 0.0% | 100.0% | 0.0% | 100.0% | 0.0% |
| Executed replication | 100.0% | 0.0% | 100.0% | 0.0% | 100.0% | 0.0% |

## Aggregate results

| Profile | DeepSeek score | GLM score | DeepSeek full passes | GLM full passes |
| --- | ---: | ---: | ---: | ---: |
| Pi base | 95.24% | 9.52% | 6/7 | 0/7 |
| ResearchPi without scientific tools | 91.67% | 28.57% | 5/7 | 2/7 |
| ResearchPi with scientific tools | 95.24% | 14.29% | 6/7 | 1/7 |

DeepSeek delivered artifacts for all 21 attempts and independently reproduced each profile's two-method, ten-seed toy study. GLM had 17 request-limit failures and completed no study reproduction. Its events contain 119 string-versus-object write-tool errors. The observed gap primarily establishes better end-to-end execution under this interface and budget, not isolated superiority in scientific reasoning.

The near-ceiling DeepSeek results contain benchmark defects: the seed task omitted the required boolean type for `complete`, and a correctly rounded sample SD was rejected under an undisclosed `1e-8` tolerance. Scores remain frozen. Fix and version these contracts before confirmatory runs; then add more difficult unseen studies and repetitions. Runs were sequential across models and backend identity, sampling adherence and actual billing are not independently verified.

Profiles are component ablations, not independent products: Pi base, ResearchPi without additional scientific tools and ResearchPi with those tools. All have common bounded workspace/Python tools; none is a full stock-product comparison.

[Offline visual comparison](deepseek-vs-glm-research-pilot.html), [aggregate comparison JSON](deepseek-vs-glm-research-pilot.json), [DeepSeek evidence scope](research-benchmark-deepseek-full-pilot.md), [GLM failure diagnosis](research-benchmark-glm-pilot.md).
