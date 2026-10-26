import { useI18n } from '~/i18n'
import { useExperienceI18n } from '~/i18n/experience'

interface EditorialCopy { title?:string; titleEn?:string; body?:string; bodyEn?:string }
/** Long bilingual editorial content is stored once beside its design. Keep
 * short UI translations in the shared lazy dictionary and use its translator
 * for both language branches, just as the rest of the world does. */
export function useEditorialText(){
 const {locale}=useI18n(),tx=useExperienceI18n()
 return (copy:EditorialCopy,field:'title'|'body')=>tx((locale==='en'?copy[field==='title'?'titleEn':'bodyEn']:undefined)??copy[field]??'')
}
