import { randomInt } from "node:crypto";

const UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijkmnopqrstuvwxyz";
const NUMBERS = "23456789";
const SYMBOLS = "!@#$%";
const ALL_CHARACTERS = `${UPPERCASE}${LOWERCASE}${NUMBERS}${SYMBOLS}`;

const getRandomCharacter = (characters: string): string => {
  return characters[randomInt(characters.length)];
};

export function createCompanyUsername(companyName: string): string {
  return companyName
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, "") // sadece boşlukları sil
    .slice(0, 8);
}

export const createStrongPassword = (): string => {
  const characters = [
    getRandomCharacter(UPPERCASE),
    getRandomCharacter(LOWERCASE),
    getRandomCharacter(NUMBERS),
    getRandomCharacter(SYMBOLS),
  ];

  while (characters.length < 10) {
    characters.push(getRandomCharacter(ALL_CHARACTERS));
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const randomIndex = randomInt(index + 1);

    [characters[index], characters[randomIndex]] = [
      characters[randomIndex],
      characters[index],
    ];
  }

  return characters.join("");
};
