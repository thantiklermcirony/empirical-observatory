# models

\*.txt files: Model files for the Systems Biology Toolbox 2 (now known as IQR Tools, https://iqrtools.intiquan.com/) for MATLAB. These files were used to obtain all simulation results (except bifurcation diagrams) in the article.<br>
\*.ode files: Model files for XPPAUT (http://www.math.pitt.edu/~bard/xpp/xpp.html). These files were used to generate bifurcation diagrams.<br>
\*.cps files: Model files for Copasi (http://copasi.org/) that reproduce selected figures from the article. These files were created for the reader's convenience and used to generate the SBML files of the models.<br>
\*.xml files: Model files in the Systems Biology Markup Language (http://sbml.org), level 2 version 4. These files were created from the Copasi version of the models for the reader's convenience.<br>

- **Heldt2019_ChlamydomonasMultipleFission**: Main model of the article, describing multiple-fission cycle in Chlamydomonas reinhardtii. With the current parameters, the model simulates growth under constant illumination (see Fig. 2D in the article).
- **Heldt2019_ChlamydomonasMultipleFission_LDcycles**: Model that includes events to simulate 12h:12h light:dark cycles (see Fig. 3F in the article).
- **Heldt2019_ChlamydomonasMultipleFission_ProteinExpression**: Model for size-dependent protein expression (described in STAR Methods and shown in Fig. S2 of the article).
