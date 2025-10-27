import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import {
  FiHome,
  FiMessageSquare,
  FiBookOpen,
  FiCalendar,
  FiUsers,
  FiBriefcase,
  FiHelpCircle,
  FiSettings,
  FiLogOut,
  FiMoon,
  FiSun,
  FiMenu,
  FiX
} from 'react-icons/fi'

import ResourceLinks from './ResourceLinks'

const navItems = [
  { path: '/', label: 'Chat', icon: <FiMessageSquare /> },
  { path: '/courses', label: 'Courses', icon: <FiBookOpen /> },
  { path: '/calendar', label: 'Calendar', icon: <FiCalendar /> },
  { path: '/organizations', label: 'Organizations', icon: <FiUsers /> },
  { path: '/career', label: 'Career', icon: <FiBriefcase /> },
  { path: '/help', label: 'Help', icon: <FiHelpCircle /> },
]

const NavMenu = ({ 
  isOpen, 
  onToggle, 
  theme, 
  onThemeToggle, 
  user, 
  onLogout 
}) => {
  const location = useLocation()

  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: -280 }
  }

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button 
        className="mobile-menu-toggle"
        onClick={onToggle}
      >
        {isOpen ? <FiX /> : <FiMenu />}
      </button>

      {/* Overlay for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="nav-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <motion.nav
        className="nav-menu"
        initial="closed"
        animate={isOpen ? "open" : "closed"}
        variants={sidebarVariants}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Logo Section */}
        <div className="nav-header">
          <img 
            src="/assets/morgan-logo.png" 
            alt="Morgan State" 
            className="nav-logo"
          />
          <div className="nav-title">
            <h2>Morgan CS</h2>
            <p>AI Assistant</p>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="nav-user">
            <div className="user-avatar">
              <FiUsers />
            </div>
            <div className="user-info">
              <p className="user-name">{user.username}</p>
              <p className="user-role">{user.role}</p>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div className="nav-links">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => window.innerWidth < 768 && onToggle()}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
          
          {/* Admin Link */}
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className={`nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
              onClick={() => window.innerWidth < 768 && onToggle()}
            >
              <span className="nav-icon"><FiSettings /></span>
              <span className="nav-label">Admin</span>
            </Link>
          )}
        </div>

        {/* Quick Resources */}
        <ResourceLinks />

        {/* Bottom Actions */}
        <div className="nav-bottom">
          {/* Theme Toggle */}
          <button 
            className="theme-toggle"
            onClick={onThemeToggle}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <FiSun /> : <FiMoon />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {/* Logout */}
          {user && (
            <button 
              className="logout-button"
              onClick={onLogout}
            >
              <FiLogOut />
              <span>Logout</span>
            </button>
          )}
        </div>
      </motion.nav>
    </>
  )
}

export default NavMenu