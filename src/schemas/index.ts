import { z } from 'zod';

// Regex dla bezpiecznej nazwy projektu (litery, cyfry, spacje, myślniki, podkreślniki)
const safeNameRegex = /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9\s\-_]+$/;

// Regex dla bezpiecznego imienia/nazwiska (litery polskie i łacińskie, spacje, myślniki)
const safePersonNameRegex = /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s\-']+$/;

// Regex dla polskiego/międzynarodowego numeru telefonu
const phoneRegex = /^(\+?[0-9]{1,4})?[\s\-]?[0-9]{3}[\s\-]?[0-9]{3}[\s\-]?[0-9]{3,4}$/;

// Funkcja do sanityzacji tekstu - usuwanie potencjalnie niebezpiecznych znaków
const sanitizeText = (text: string): string => {
  return (
    text
      // Usuwanie tagów HTML/XML
      .replace(/<[^>]*>/g, '')
      // Usuwanie znaków specjalnych używanych w atakach XSS
      .replace(/[<>'"`;(){}[\]\\]/g, '')
      // Usuwanie sekwencji javascript:, data:, vbscript:
      .replace(/javascript:|data:|vbscript:/gi, '')
      // Usuwanie znaków kontrolnych
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Normalizacja białych znaków
      .replace(/\s+/g, ' ')
      .trim()
  );
};

// Funkcja do sanityzacji wiadomości - mniej restrykcyjna, pozwala na więcej znaków
const sanitizeMessage = (text: string): string => {
  return (
    text
      // Usuwanie tagów HTML/XML
      .replace(/<[^>]*>/g, '')
      // Usuwanie niebezpiecznych sekwencji
      .replace(/javascript:|data:|vbscript:/gi, '')
      // Usuwanie znaków kontrolnych (oprócz nowych linii)
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim()
  );
};

// Regex dla domeny/URL (podstawowa walidacja)
// Obsługuje: domeny (example.com), localhost, adresy IP, z opcjonalnym protokołem http(s), portem i ścieżką
const domainRegex =
  /^(https?:\/\/)?(([a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}|localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?(\/.*)?$/;

export const CreateProjectSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Nazwa musi mieć co najmniej 2 znaki' })
    .max(100, { message: 'Nazwa może mieć maksymalnie 100 znaków' })
    .regex(safeNameRegex, {
      message: 'Nazwa może zawierać tylko litery, cyfry, spacje, myślniki i podkreślniki',
    })
    .transform((val) => val.trim()), // Usuń białe znaki z początku i końca

  domain: z
    .string()
    .min(1, { message: 'Domena jest wymagana' })
    .max(255, { message: 'Domena może mieć maksymalnie 255 znaków' })
    .refine(
      (val) => {
        // Pozwól na puste pole lub poprawny format
        if (!val) return true;
        return domainRegex.test(val);
      },
      {
        message:
          'Nieprawidłowy format domeny (np. moja-aplikacja.pl lub https://moja-aplikacja.pl)',
      }
    )
    .transform((val) => val.trim().toLowerCase()), // Normalizuj domenę
});

// Schemat walidacji formularza kontaktowego
export const ContactFormSchema = z.object({
  firstName: z
    .string()
    .min(2, { message: 'Imię musi mieć co najmniej 2 znaki' })
    .max(50, { message: 'Imię może mieć maksymalnie 50 znaków' })
    .regex(safePersonNameRegex, {
      message: 'Imię może zawierać tylko litery, spacje i myślniki',
    })
    .transform(sanitizeText),

  lastName: z
    .string()
    .min(2, { message: 'Nazwisko musi mieć co najmniej 2 znaki' })
    .max(50, { message: 'Nazwisko może mieć maksymalnie 50 znaków' })
    .regex(safePersonNameRegex, {
      message: 'Nazwisko może zawierać tylko litery, spacje i myślniki',
    })
    .transform(sanitizeText),

  email: z
    .string()
    .min(1, { message: 'Email jest wymagany' })
    .max(100, { message: 'Email może mieć maksymalnie 100 znaków' })
    .email({ message: 'Nieprawidłowy format adresu email' })
    .transform((val) => val.trim().toLowerCase()),

  phone: z
    .string()
    .max(20, { message: 'Numer telefonu może mieć maksymalnie 20 znaków' })
    .refine(
      (val) => {
        // Telefon jest opcjonalny - puste pole jest OK
        if (!val || val.trim() === '') return true;
        return phoneRegex.test(val.replace(/\s/g, ''));
      },
      {
        message: 'Nieprawidłowy format numeru telefonu (np. +48 123 456 789)',
      }
    )
    .transform((val) => val.replace(/[^\d+\s\-]/g, '').trim())
    .optional()
    .or(z.literal('')),

  message: z
    .string()
    .min(10, { message: 'Wiadomość musi mieć co najmniej 10 znaków' })
    .max(2000, { message: 'Wiadomość może mieć maksymalnie 2000 znaków' })
    .transform(sanitizeMessage),
});

export type ContactFormData = z.infer<typeof ContactFormSchema>;
