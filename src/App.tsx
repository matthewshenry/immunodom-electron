import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/electron-vite.animate.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="container">
      <img src="/images/gator.png" alt="Gators Logo" className="logo" />
      <h1 className="headerAbout">About Peptide Binders Project</h1>
      <section className="section">
        <h2 className="subHeader">Abstract</h2>
        <p className="paragraph">The Peptide Binders project aims to aid immune researchers, by developing a tool that identifies and evaluates immunodominant peptides binding to HLA molecules more efficiently. By leveraging the Immune Epitope Database (IEDB) and enhancing data presentation and usability, the project seeks to streamline the research process, reduce time and labor, and ultimately contribute to actionable research outcomes in the fields of autoimmune diseases, vaccine development, cancer immunology, and infectious disease control.</p>
      </section>

      <section className="section">

        <img src="/images/peptide_three.png" alt="Peptide Binding" className="image" />

        <h3 className="subHeader">Overview of Images</h3>
        <p className="paragraph">The images show three HLA molecules (HLA-B*38:01, HLA-C*07:01, and HLA-C*12:03) each binding autoantigen peptides implicated in the initiation and/or perpetuation of deleterious T cell responses in Type I Diabetes patients.</p>

        <h3 className="subHeader">Why It's Important</h3>
        <ul className="list">
          <li><strong>Immune Function:</strong> HLA molecules present peptides to T cells, helping the immune system recognize and respond to threats.</li>
          <li><strong>Type 1 Diabetes:</strong> In T1D, the immune system attacks insulin-producing cells. Studying these interactions helps understand this process.</li>
          <li><strong>Therapeutic Potential:</strong> Insights into peptide-HLA binding can lead to new treatments, such as vaccines or immunotherapies, to modulate the immune response.</li>
        </ul>
        </section>
        <h3 className="subHeader">Problem Statement</h3>
        <p className="paragraph">Researchers face significant challenges in efficiently identifying and evaluating the portions of proteins that stimulate T cell responses. The existing manual process is time-consuming and labor-intensive, hindering progress in critical areas such as cancer research and autoimmune disease studies.</p>

        <h3 className="subHeader">Contribution</h3>
        <p className="paragraph">Our solution builds upon existing tools by enhancing data visualization and user interaction. By providing graphical representations, user accounts, and streamlined data access, we significantly reduce the time and effort required for researchers to analyze protein-binding data.</p>

        <h3 className="subHeader">Context</h3>
        <p className="paragraph">
          <strong>MHC-I Molecules:</strong> These are found on almost all cells in your body. They present pieces of proteins (antigens) from inside the cell to the immune system. This helps the immune system detect if a cell is infected or abnormal.
        </p>
        <p className="paragraph">
          <strong>MHC-II Molecules:</strong> These are found on specialized immune cells like dendritic cells, macrophages, and B cells. They present pieces of proteins from outside the cell to the immune system, helping it recognize and respond to external threats.
        </p>

        <h3 className="subHeader">Problem Domain</h3>
        <p className="paragraph">The Peptide Binders project intersects the fields of computer science, bioinformatics, and immunology. It addresses the need for efficient data processing and visualization in immunological research, particularly in understanding protein-peptide interactions and their implications for disease treatment and prevention.</p>
        <ul className="list">
          <li>
            <strong>Autoimmune Diseases:</strong> Sometimes, the immune system mistakenly attacks the body's own cells. Understanding how MHC and T cells interact can help researchers find ways to prevent or treat these diseases.
          </li>
          <li>
            <strong>Vaccine Development:</strong> Vaccines work by training the immune system to recognize and fight off specific pathogens. Knowing how MHC and T cells work together helps in designing effective vaccines.
          </li>
          <li>
            <strong>Cancer Immunology:</strong> Cancer cells can sometimes hide from the immune system. By studying MHC and T cell interactions, researchers can develop treatments that help the immune system detect and destroy cancer cells.
          </li>
          <li>
            <strong>Infectious Disease Control:</strong> Understanding these interactions helps in developing treatments and strategies to fight infections more effectively.
          </li>
        </ul>

        <section className="section">
        <h2 className="subHeader">Solution</h2>
        <p className="paragraph">
          <strong>Data Integration:</strong> Querying the IEDB for protein sequence data and receiving binding affinity predictions.
        </p>
        <p className="paragraph">
          <strong>Data Visualization:</strong> Presenting data through interactive graphs and tables, allowing researchers to overlay multiple searches and zoom in on specific data points.
        </p>
        <p className="paragraph">
          <strong>User Accounts:</strong> Enabling researchers to save searches, view saved results, and organize their data.
        </p>
        <p className="paragraph">
          <strong>Data Stream for Bulk Searches:</strong> Allowing researchers to view results as they are processed, rather than waiting for the entire dataset to be completed.
        </p>
      </section>
      
      <section className="section">
        <h2 className="subHeader">Architecture Diagram</h2>
        <img src="/images/architecture_color.png" alt="Architecture Diagram" className="image" style={{ width: '65%' }} />
      </section>

      <section className="section">
        <h2 className="subHeader">Outcome</h2>
        <p className="paragraph">The Peptide Binders project has aimed to deliver a web application that integrates IEDB data with interactive visualizations and streamlined workflows to enhance researcher efficiency. Through our work, researchers can more easily analyze protein-binding data through features like real-time result streams, customizable graphs, detailed data points, and saved searches. These improvements reduce processing time and enhance usability, supporting important research in the areas of cancer immunology, vaccine development, and infectious disease.</p>
      </section>

      <section className="section">
        <h2 className="subHeader">Results</h2>
        <p className="paragraph">The application effectively reduces the time and effort required for researchers to analyze protein-binding data. Graphical outputs and interactive features are shown below</p>
        
        <h3 className="subHeader">Search Form</h3>
        <p className="paragraph">The search form allows users to input data and dynamically renders alleles based on species and methods. Users can process either MHC-I or MHC-II searches.</p>
        <img src="/images/search_form.png" alt="Search Form" className="image" style={{ width: '50%' }} />

        <h3 className="subHeader">Results Overview</h3>
        <p className="paragraph">The results window displays an interactive graph and a dropdown for the available data sets. The graph and table render dynamically upon selection of one or more datasets.</p>
        <img src="/images/results_whole.png" alt="Results Overview" className="image" style={{ width: '75%' }}/>

        <h3 className="subHeader">Data Point Details</h3>
        <p className="paragraph">When a user clicks on a point on the graph, a modal appears showing important data about that point.</p>
        <img src="/images/data_point.png" alt="Data Point Details" className="image" style={{ width: '50%' }} />

        <h3 className="subHeader">Zoom Feature</h3>
        <p className="paragraph">The graph includes a zoom feature, allowing users to focus on specific data points.</p>
        <img src="/images/results_zoom.png" alt="Zoom Feature" className="image" style={{ width: '75%' }}/>

        <h3 className="subHeader">Graph Settings</h3>
        <p className="paragraph">Users can edit the graph to be linear or logarithmic, change the y-axis, or adjust the line thickness.</p>
        <img src="/images/settings.png" alt="Graph Settings" className="image" style={{ width: '40%' }} />

        <h3 className="subHeader">Results Data</h3>
        <p className="paragraph">The table of the results provides a detailed view of the data.</p>
        <img src="/images/results_data.png" alt="Results Data" className="image" style={{ width: '100%' }} />
      
        <h3 className="subHeader">Saved Searches</h3>
        <p className="paragraph">The saved searches page shows a list of saved searches. Users can click on them to be redirected to the results page for that search. They can also edit or delete searches.</p>
        <img src="/images/saved_searches.png" alt="Saved Searches" className="image" style={{ width: '50%' }} />
      </section>

      <section className="section">
        <h2 className="subHeader">Conclusions</h2>
        <h3 className="subHeader">Summary</h3>
        <p className="paragraph">The Peptide Binders project successfully developed a web application that integrates IEDB data and enhances data visualization and user interaction. This tool significantly improves the efficiency and accuracy of immunological research.</p>
        <h3 className="subHeader">Future Work and Directions</h3>
        <p className="paragraph">Future work will focus on further enhancing the application's features, such as improving data filtering and expanding the range of supported prediction methods. Additionally, integrating feedback from researchers will guide ongoing improvements. A key improvement will be increasing the throughput of data processing and reducing queuing times, ensuring that researchers can access and analyze data more efficiently.</p>
      </section>

      <section className="section">
        <div className="techStack">
            <img src="/images/react.png" alt="React" className="techLogo" />
            <img src="/images/ts.png" alt="TypeScript" className="techLogo" />
            <img src="/images/java.png" alt="Java" className="techLogo" />
            <img src="/images/spring.png" alt="Spring Boot" className="techLogo" />
            <img src="/images/aws.png" alt="AWS" className="techLogo" />
            <img src="/images/mongo.jpeg" alt="MongoDB" className="techLogo" />
        </div>
      </section>
    </div>
  )
}

export default App
