import { SeedPhraseWord } from '../routes/setup/BackupConfirmPage'

export const findPositionOfSelectedWord = (
    wordsArray: SeedPhraseWord[],
    word: SeedPhraseWord
) => {
    return wordsArray.findIndex(
        wordObj => wordObj.word === word.word && wordObj.isSelected
    )
}
