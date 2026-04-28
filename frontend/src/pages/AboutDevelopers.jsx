import './AboutDevelopers.css';

const developers = [
  {
    name: 'Aarav Kumar',
    usn: '1BV23CS001',
    points: ['Frontend layout and UI cleanup', 'Integrated routing for new pages', 'Handled responsive behavior fixes']
  },
  {
    name: 'Ishita Reddy',
    usn: '1BV23CS014',
    points: ['Worked on booking flow enhancements', 'Improved form validation handling', 'Documented component usage notes']
  },
  {
    name: 'Nikhil Shetty',
    usn: '1BV23CS027',
    points: ['API integration and data wiring', 'Refined dashboard data rendering', 'Optimized repeated utility usage']
  },
  {
    name: 'Meghana Rao',
    usn: '1BV23CS039',
    points: ['Reports page updates and polish', 'Assisted with QA and testing scenarios', 'Coordinated release-ready checks']
  }
];

function AboutDevelopers() {
  return (
    <div className="page about-page">
      <div className="page-header">
        <h2>Developers</h2>
        <p>Team members who worked on this project.</p>
      </div>

      <div className="about-grid">
        {developers.map((developer) => (
          <article className="about-card card" key={developer.usn}>
            <div className="about-photo-placeholder">Photo</div>
            <div className="about-details">
              <h3>{developer.name}</h3>
              <p className="about-usn">{developer.usn}</p>
              <ul className="about-points">
                {developer.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default AboutDevelopers;
