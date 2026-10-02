import { DocumentAnalysis } from '../types';

export const SAMPLE_DOCUMENTS: { id: string; label: string; description: string; data: DocumentAnalysis }[] = [
  {
    id: 'deep-sleep',
    label: 'مقال علمي: سر النوم العميق والذاكرة',
    description: 'مقال شيق يستعرض كيف يعزز النوم ترسيخ المعلومات في الدماغ، مع مفردات وتراكيب غنية.',
    data: {
      documentTitle: 'The Science of Deep Sleep and Memory Consolidation',
      overviewSummary: 'دراسة علمية مبسطة تبين كيفية معالجة الدماغ البشري للمعلومات أثناء النوم العميق وتأثير ذلك على قوة الذاكرة والتعلم.',
      totalSentences: 5,
      pages: [
        {
          pageNumber: 1,
          pageTitle: 'آلية ترسيخ الذكريات أثناء الراحة الليلية',
          sentences: [
            {
              sentenceIndex: 1,
              english: 'During deep sleep, the brain actively replays memories from the day, consolidating them into long-term storage.',
              contextualTranslation: 'أثناء مرحلة النوم العميق، يعيد الدماغ استرجاع ذكريات اليوم بنشاط، مما يرسخها في مخزن الذاكرة طويلة المدى.',
              literalTranslation: 'خلال [During] النوم العميق [deep sleep]، الدماغ [the brain] بنشاط [actively] يعيد تشغيل [replays] الذكريات [memories] من اليوم [from the day]، مدمجاً إياها [consolidating them] في [into] تخزين طويل الأمد [long-term storage].',
              linguisticNote: 'الفعل "consolidating" يأتي كحال مسبب (participle clause) يوضح النتيجة الحتمية لإعادة تشغيل الذكريات.',
              vocabulary: [
                { word: 'consolidating', arabicMeaning: 'ترسيخ وتثبيت', partOfSpeech: 'فعل', phonetic: 'kən-SOL-i-day-ting' },
                { word: 'replays', arabicMeaning: 'يعيد تشغيل أو استرجاع', partOfSpeech: 'فعل', phonetic: 'ree-PLAYS' },
                { word: 'long-term storage', arabicMeaning: 'مخزن الذاكرة طويلة المدى', partOfSpeech: 'مصطلح/اسم', phonetic: 'long term STOR-ij' },
              ],
            },
            {
              sentenceIndex: 2,
              english: 'Neuroscientists have discovered that slow brain waves act like a biological courier service between brain regions.',
              contextualTranslation: 'اكتشف علماء الأعصاب أن موجات الدماغ البطيئة تعمل بمثابة وسيلة نقل حيوية تنقل البيانات بين مختلف مناطق المخ.',
              literalTranslation: 'علماء الأعصاب [Neuroscientists] قد اكتشفوا [have discovered] أن [that] موجات الدماغ البطيئة [slow brain waves] تتصرف مثل [act like] خدمة توصيل بيولوجية [a biological courier service] بين [between] مناطق الدماغ [brain regions].',
              linguisticNote: 'استخدام صيغة المضارع التام (have discovered) يعبر عن اكتشاف علمي حديث ما زالت نتائجه قائمة ومؤثرة.',
              vocabulary: [
                { word: 'Neuroscientists', arabicMeaning: 'علماء الأعصاب', partOfSpeech: 'اسم', phonetic: 'nyoor-oh-SYE-en-tists' },
                { word: 'courier', arabicMeaning: 'ساعي بريد / ناقل سريع', partOfSpeech: 'اسم', phonetic: 'KOOR-ee-er' },
                { word: 'regions', arabicMeaning: 'مناطق أو أقاليم', partOfSpeech: 'اسم', phonetic: 'REE-jənz' },
              ],
            },
            {
              sentenceIndex: 3,
              english: 'Without adequate rest, our cognitive performance drops drastically, hindering critical problem-solving skills.',
              contextualTranslation: 'بدون قسط كافٍ من الراحة، تتدهور كفاءتنا الإدراكية بشكل حاد، مما يعيق مهارات حل المشكلات المعقدة.',
              literalTranslation: 'بدون [Without] راحة كافية [adequate rest]، أداؤنا المعرفي [our cognitive performance] يهبط [drops] بشكل حاد [drastically]، معيقاً [hindering] مهارات حل المشكلات الحاسمة [critical problem-solving skills].',
              linguisticNote: 'الظرف "drastically" يضيف تأكيداً قوياً على سرعة وعمق التدهور، و"hindering" تعني عرقلة السريان الطبيعي.',
              vocabulary: [
                { word: 'adequate', arabicMeaning: 'كافٍ وملائم', partOfSpeech: 'صفة', phonetic: 'AD-i-kwit' },
                { word: 'cognitive', arabicMeaning: 'معرفي / إدراكي', partOfSpeech: 'صفة', phonetic: 'KOG-ni-tiv' },
                { word: 'drastically', arabicMeaning: 'بشكل حاد وكبير', partOfSpeech: 'ظرف', phonetic: 'DRAS-tik-lee' },
                { word: 'hindering', arabicMeaning: 'معرقلاً / مانعاً', partOfSpeech: 'فعل', phonetic: 'HIN-der-ing' },
              ],
            },
            {
              sentenceIndex: 4,
              english: 'Moreover, cellular repair mechanisms kick in, clearing out metabolic waste products that accumulated throughout the day.',
              contextualTranslation: 'علاوة على ذلك، تبدأ آليات الإصلاح الخلوي عملها، حيث تقوم بتنقية الدماغ من الفضلات الأيضية التي تراكمت على مدار اليوم.',
              literalTranslation: 'علاوة على ذلك [Moreover]، آليات الإصلاح الخلوي [cellular repair mechanisms] تبدأ بالعمل [kick in]، منظفةً [clearing out] نواتج الفضلات الأيضية [metabolic waste products] التي [that] تراكمت [accumulated] طوال اليوم [throughout the day].',
              linguisticNote: 'التعبير الاصطلاحي "kick in" يعني يبدأ مفعوله أو يبدأ نشاطه تلقائياً.',
              vocabulary: [
                { word: 'kick in', arabicMeaning: 'يبدأ في العمل / يسري مفعوله', partOfSpeech: 'تعبير اصطلاحي', phonetic: 'kik in' },
                { word: 'metabolic', arabicMeaning: 'أيضي / متعلق بالتمثيل الغذائي', partOfSpeech: 'صفة', phonetic: 'met-uh-BAH-lik' },
                { word: 'accumulated', arabicMeaning: 'تراكمت وتجمعت', partOfSpeech: 'فعل ماضٍ', phonetic: 'uh-KYOO-myuh-lay-tid' },
              ],
            },
            {
              sentenceIndex: 5,
              english: 'Therefore, prioritizing a consistent sleep schedule is paramount for both mental clarity and long-term vitality.',
              contextualTranslation: 'لذا، فإن إعطاء الأولوية لجدول نوم منتظم يُعد أمراً في غاية الأهمية لصفاء الذهن والحفاظ على الحيوية والنشاط.',
              literalTranslation: 'لذلك [Therefore]، إعطاء الأولوية لـ [prioritizing] جدول نوم متسق [a consistent sleep schedule] يكون بالغ الأهمية [is paramount] لـ كلا [for both] الوضوح العقلي [mental clarity] و الحيوية طويلة الأجل [long-term vitality].',
              linguisticNote: '"paramount" كلمة رفيعة المستوى تعني أكثر أهمية من أي شيء آخر (supreme / superior).',
              vocabulary: [
                { word: 'prioritizing', arabicMeaning: 'ترتيب الأولويات / إعطاء الأسبقية', partOfSpeech: 'اسم/فعل', phonetic: 'pry-OR-i-tye-zing' },
                { word: 'paramount', arabicMeaning: 'بالغ الأهمية / في الصدارة', partOfSpeech: 'صفة', phonetic: 'PAIR-uh-mownt' },
                { word: 'vitality', arabicMeaning: 'حيوية ونشاط وطاقة', partOfSpeech: 'اسم', phonetic: 'vye-TAL-i-tee' },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'tech-ai',
    label: 'مقال تقني: ثورة الذكاء الاصطناعي في الطب',
    description: 'كيف يغير التشخيص المبكر حياة المرضى وسرعة الأطباء في اتخاذ القرارات المصيرية.',
    data: {
      documentTitle: 'How Modern AI Is Revolutionizing Diagnostic Medicine',
      overviewSummary: 'استعراض للدور المتسارع لخوارزميات التعلم الآلي في فحص الأشعة الطبية واكتشاف الأورام في مراحل مبكرة جداً.',
      totalSentences: 4,
      pages: [
        {
          pageNumber: 1,
          pageTitle: 'التشخيص الدقيق والذكاء الاصطناعي',
          sentences: [
            {
              sentenceIndex: 1,
              english: 'Cutting-edge machine learning models are now capable of spotting microscopic anomalies that even seasoned radiologists might overlook.',
              contextualTranslation: 'باتت أحدث نماذج التعلم الآلي قادرة على رصد أدق التشوهات المجهرية التي قد تفوت حتى أطباء الأشعة الأكثر خبرة وتمرساً.',
              literalTranslation: 'المتطورة [Cutting-edge] نماذج التعلم الآلي [machine learning models] تكون الآن [are now] قادرة على [capable of] رصد [spotting] الشذوذات المجهرية [microscopic anomalies] التي [that] حتى [even] أطباء الأشعة المخضرمون [seasoned radiologists] قد [might] يغفلون عنها [overlook].',
              linguisticNote: '"seasoned" هنا لا تعني متبل بالطعام، بل تعني خبير ومتمرس عبر سنوات طويلة من الممارسة.',
              vocabulary: [
                { word: 'cutting-edge', arabicMeaning: 'فائق التطور / أحدث صيحة', partOfSpeech: 'صفة مركبة', phonetic: 'KUHT-ing ej' },
                { word: 'anomalies', arabicMeaning: 'تشوهات أو حالات غير طبيعية', partOfSpeech: 'اسم جمع', phonetic: 'uh-NOM-uh-leez' },
                { word: 'seasoned', arabicMeaning: 'مخضرم / ذو خبرة عريقة', partOfSpeech: 'صفة', phonetic: 'SEE-znd' },
                { word: 'overlook', arabicMeaning: 'يغفل عن / يفوت عليه', partOfSpeech: 'فعل', phonetic: 'oh-ver-LOOK' },
              ],
            },
            {
              sentenceIndex: 2,
              english: 'Rather than replacing physicians, these digital assistants augment human judgment, expediting critical care workflows.',
              contextualTranslation: 'وعوضاً عن استبدال الأطباء، تعمل هذه المساعدات الرقمية على تعزيز الحكم البشري وتسريع وتيرة اتخاذ القرارات في الحالات الحرجة.',
              literalTranslation: 'بدلاً من [Rather than] استبدال الأطباء [replacing physicians]، هؤلاء المساعدون الرقميون [these digital assistants] يعززون [augment] الحكم البشري [human judgment]، معجلين [expediting] مسارات رعاية الحالات الحرجة [critical care workflows].',
              linguisticNote: '"Rather than" تعبير شائع للاستدراك يعني "بدلاً من أن...". الفعل "augment" يعني الزيادة والتدعيم.',
              vocabulary: [
                { word: 'augment', arabicMeaning: 'يدعم ويعزز', partOfSpeech: 'فعل', phonetic: 'awg-MENT' },
                { word: 'expediting', arabicMeaning: 'تسريع وتسهيل الإجراءات', partOfSpeech: 'فعل', phonetic: 'EK-spi-dye-ting' },
                { word: 'workflows', arabicMeaning: 'مسارات أو تدفقات العمل', partOfSpeech: 'اسم', phonetic: 'WURK-flohz' },
              ],
            },
            {
              sentenceIndex: 3,
              english: 'Early clinical trials demonstrated an astonishing thirty percent reduction in false negative diagnostic reports.',
              contextualTranslation: 'أظهرت التجارب السريرية الأولية انخفاضاً مذهلاً بنسبة ثلاثين بالمئة في تقارير التشخيص السلبية الخاطئة.',
              literalTranslation: 'المبكرة [Early] التجارب السريرية [clinical trials] أظهرت [demonstrated] انخفاضاً مذهلاً [an astonishing] ثلاثين في المئة [thirty percent] تخفيضاً [reduction] في [in] التقارير التشخيصية السلبية الكاذبة [false negative diagnostic reports].',
              linguisticNote: '"False negative" مصطلح طبي وإحصائي شهير يعني أن الفحص يقول أن المريض سليم بينما هو في الواقع مصاب.',
              vocabulary: [
                { word: 'astonishing', arabicMeaning: 'مذهل ومبهر', partOfSpeech: 'صفة', phonetic: 'uh-STON-i-shing' },
                { word: 'false negative', arabicMeaning: 'سلبي كاذب (فحص سليم كذباً)', partOfSpeech: 'مصطلح طبي', phonetic: 'fawls NEG-uh-tiv' },
                { word: 'reduction', arabicMeaning: 'تقليص أو تخفيض', partOfSpeech: 'اسم', phonetic: 'ri-DUK-shun' },
              ],
            },
            {
              sentenceIndex: 4,
              english: 'Consequently, patients in remote regions can soon expect unprecedented access to top-tier specialist evaluations.',
              contextualTranslation: 'وبناءً على ذلك، سيحظى المرضى في المناطق النائية والبعيدة بفرصة غير مسبوقة للوصول إلى تقييمات استشارية من الدرجة الأولى.',
              literalTranslation: 'نتيجة لذلك [Consequently]، المرضى [patients] في المناطق النائية [in remote regions] يستطيعون قريباً [can soon] أن يتوقعوا [expect] وصولاً غير مسبوق [unprecedented access] إلى [to] تقييمات المتخصصين رفيعة المستوى [top-tier specialist evaluations].',
              linguisticNote: '"unprecedented" صفة تدل على حدث لم يسبق له مثيل في التاريخ أو التجربة السابقة.',
              vocabulary: [
                { word: 'Consequently', arabicMeaning: 'ونتيجة لذلك / بالتبعية', partOfSpeech: 'ظرف رابط', phonetic: 'KON-si-kwent-lee' },
                { word: 'unprecedented', arabicMeaning: 'غير مسبوق إطلاقاً', partOfSpeech: 'صفة', phonetic: 'un-PRES-i-den-tid' },
                { word: 'top-tier', arabicMeaning: 'من الفئة الأولى / النخبة', partOfSpeech: 'صفة مركبة', phonetic: 'top-TEER' },
              ],
            },
          ],
        },
      ],
    },
  },
];
