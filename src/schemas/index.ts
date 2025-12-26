import { z } from 'zod';

// Regex dla bezpiecznej nazwy projektu (litery, cyfry, spacje, myślniki, podkreślniki)
const safeNameRegex = /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9\s\-_]+$/;

// Regex dla domeny/URL (podstawowa walidacja)
const domainRegex =
  /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:[0-9]+)?(\/.*)?$|^localhost(:[0-9]+)?(\/.*)?$/;

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
