import { describe, it, expect } from 'vitest';
import { CreateProjectSchema, ContactFormSchema } from './index';

describe('Zod Schemas', () => {
  describe('CreateProjectSchema', () => {
    it('powinien przejść walidację dla poprawnych danych', () => {
      const data = {
        name: 'Mój Projekt',
        domain: 'example.com',
      };
      const result = CreateProjectSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Mój Projekt');
        expect(result.data.domain).toBe('example.com');
      }
    });

    it('powinien normalizować nazwę i domenę (trim, lowercase)', () => {
      const data = {
        name: '  Brudna Nazwa  ',
        domain: '  EXAMPLE.COM  ',
      };
      const result = CreateProjectSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Brudna Nazwa');
        expect(result.data.domain).toBe('example.com');
      }
    });

    it('powinien odrzucić zbyt krótką nazwę', () => {
      const result = CreateProjectSchema.safeParse({ name: 'A', domain: 'test.com' });
      expect(result.success).toBe(false);
    });

    it('powinien odrzucić niebezpieczne znaki w nazwie', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Projekt <script>',
        domain: 'test.com',
      });
      expect(result.success).toBe(false);
    });

    it('powinien akceptować localhost i adresy IP jako domeny', () => {
      expect(CreateProjectSchema.safeParse({ name: 'Local', domain: 'localhost' }).success).toBe(
        true
      );
      expect(CreateProjectSchema.safeParse({ name: 'IP', domain: '127.0.0.1' }).success).toBe(true);
      expect(
        CreateProjectSchema.safeParse({ name: 'Port', domain: 'localhost:3000' }).success
      ).toBe(true);
    });
  });

  describe('ContactFormSchema', () => {
    it('powinien przejść walidację i sanityzować dane', () => {
      const data = {
        firstName: 'Jan',
        lastName: 'Kowalski',
        email: 'JAN.Kowalski@EXAMPLE.com',
        phone: '+48 123 456 789',
        message: 'Dzień dobry, chciałbym zapytać o ofertę.',
      };
      const result = ContactFormSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('jan.kowalski@example.com');
        expect(result.data.firstName).toBe('Jan');
      }
    });

    it('powinien usuwać tagi HTML z imienia i nazwiska (XSS Prevention)', () => {
      const data = {
        firstName: 'Jan <script>alert("XSS")</script>',
        lastName: 'Kowalski <b>Pogrubiony</b>',
        email: 'test@example.com',
        message: 'Poprawna wiadomość o odpowiedniej długości.',
      };
      const result = ContactFormSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe('Jan alertXSS');
        expect(result.data.lastName).toBe('Kowalski Pogrubiony');
      }
    });

    it('powinien sanityzować wiadomość zachowując tekst', () => {
      const data = {
        firstName: 'Jan',
        lastName: 'Kowalski',
        email: 'test@example.com',
        message: 'Wiadomość z <img src=x onerror=alert(1)> oraz javascript:void(0)',
      };
      const result = ContactFormSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).not.toContain('<img');
        expect(result.data.message).not.toContain('javascript:');
        expect(result.data.message).toContain('Wiadomość z  oraz');
      }
    });

    it('powinien odrzucić zbyt krótką wiadomość', () => {
      const result = ContactFormSchema.safeParse({
        firstName: 'Jan',
        lastName: 'Kowalski',
        email: 'test@example.com',
        message: 'Krótka',
      });
      expect(result.success).toBe(false);
    });

    it('powinien akceptować brak numeru telefonu', () => {
      const data = {
        firstName: 'Jan',
        lastName: 'Kowalski',
        email: 'test@example.com',
        message: 'To jest wystarczająco długa wiadomość kontaktowa.',
        phone: '',
      };
      const result = ContactFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});
