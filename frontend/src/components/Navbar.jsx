// Top bar of the page: shows the app name and who is logged in
function Navbar({ user, onLoginClick, onLogout }) {
  return (
    <header className="navbar">
      <div className="logo">
        <span>S</span>tudent Manager
      </div>

      <div className="navbar-user">
        {user ? (
          <>
            <p className="navbar-tag">
              {user.name} <span className="role-badge">{user.role}</span>
            </p>
            <button type="button" className="btn btn-small btn-secondary" onClick={onLogout}>
              Log out
            </button>
          </>
        ) : (
          onLoginClick && (
            <button type="button" className="btn btn-small btn-primary" onClick={onLoginClick}>
              Log in
            </button>
          )
        )}
      </div>
    </header>
  );
}

export default Navbar;
