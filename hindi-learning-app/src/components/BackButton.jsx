import './BackButton.css'

function BackButton({ onClick }) {
  return (
    <button className="back-button" onClick={onClick} aria-label="Back to main menu">
      <span className="back-button-icon">🏠</span>
      <span className="back-button-text">Home</span>
    </button>
  )
}

export default BackButton
