import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import AdminNav from '../AdminNav.svelte';

vi.mock('$lib/state/token.svelte.js', () => ({
  clearToken: vi.fn(),
}));

afterEach(() => cleanup());

describe('AdminNav', () => {
  it('renders all 4 nav links', () => {
    render(AdminNav);
    expect(screen.getByText('Дашборд')).toBeTruthy();
    expect(screen.getByText('Выплаты')).toBeTruthy();
    expect(screen.getByText('Якоря')).toBeTruthy();
    expect(screen.getByText('Бот')).toBeTruthy();
  });

  it('renders "Выйти" button', () => {
    render(AdminNav);
    expect(screen.getByText('Выйти')).toBeTruthy();
  });

  it('active tab has "primary" class', () => {
    render(AdminNav, { props: { active: 'dashboard' } });
    const dashboardLink = screen.getByText('Дашборд');
    expect(dashboardLink.classList.contains('primary')).toBe(true);
  });

  it('inactive tabs do not have "primary" class', () => {
    render(AdminNav, { props: { active: 'dashboard' } });
    const disbursementsLink = screen.getByText('Выплаты');
    expect(disbursementsLink.classList.contains('primary')).toBe(false);
  });

  it('no active prop means no tab has primary class', () => {
    render(AdminNav);
    const links = screen.getAllByRole('link');
    for (const link of links) {
      expect(link.classList.contains('primary')).toBe(false);
    }
  });
});
