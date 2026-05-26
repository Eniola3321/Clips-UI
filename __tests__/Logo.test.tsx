import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Logo from '@/components/shared/Logo'

describe('Logo Component', () => {
  it('renders full variant by default', () => {
    render(<Logo />)
    expect(screen.getByText('ClipCash')).toBeInTheDocument()
    expect(screen.getByText('⚡')).toBeInTheDocument()
  })

  it('renders simple variant when specified', () => {
    render(<Logo variant="simple" />)
    const simpleLogo = document.querySelector('svg')
    expect(simpleLogo).toBeInTheDocument()
    expect(screen.queryByText('ClipCash')).not.toBeInTheDocument()
  })

  it('has correct link in full variant', () => {
    render(<Logo />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/')
  })
})
