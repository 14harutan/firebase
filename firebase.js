import axios from 'axios';
import * as cheerio from 'cheerio';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

/*
firebase の設定です。
firebase のプロジェクトの設定 ＞ マイアプリ > SDK のコードからコピペしてください。
*/
const firebaseConfig = {
    apiKey: "AIzaSyBMiBBPBV19e-t0f4BUZ6uvkJMlorW_EeQ",
    authDomain: "sample-5d8fd.firebaseapp.com",
    projectId: "sample-5d8fd",
    storageBucket: "sample-5d8fd.appspot.com",
    messagingSenderId: "397389437618",
    appId: "1:397389437618:web:8414b04eab0e61f670c7ab",
    measurementId: "G-CK57HQ39NX"
};


// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 最上位の親ファイルURL
const topParentUrl = 'https://syllabus.adm.nagoya-u.ac.jp/affiliation_selection_2024.html';

// 1. 最上位の親ファイルから学部リンクを抽出
async function extractTopParentLinks() {
    try {
        const { data } = await axios.get(topParentUrl);
        const $ = cheerio.load(data);
        const topParentLinks = [];

        // 学部リンクを抽出
        $('div.contents_1 a').each((index, element) => {
            let link = $(element).attr('href');
            if (link) {
                const absoluteUrl = new URL(link, topParentUrl).href;
                if (absoluteUrl.includes('data')) {
                    topParentLinks.push(absoluteUrl);
                }
            }
        });

        // 学部リンクをテキストファイルに保存
        fs.writeFileSync('top_parent_links.txt', topParentLinks.join('\n'));
        console.log('最上位の親リンクを保存しました');
        return topParentLinks;
    } catch (error) {
        console.error('最上位の親ファイルからリンクを取得中にエラー:', error);
    }
}

// 2. 中位の親ファイルから科目リンクを取得
async function extractParentLinks(departmentUrl) {
    try {
        const { data } = await axios.get(departmentUrl);
        const $ = cheerio.load(data);
        const parentLinks = [];

        // 各学部ページのリンクを抽出
        $('div.contents_1 a').each((index, element) => {
            let link = $(element).attr('href');
            if (link) {
                const absoluteUrl = new URL(link, departmentUrl).href;
                if (absoluteUrl.includes('html')) {
                    parentLinks.push(absoluteUrl);
                }
            }
        });

        return parentLinks;
    } catch (error) {
        console.error('学部ページからリンクを取得中にエラー:', error);
    }
}

// 3. 子ファイルから授業シラバスリンクを取得
async function extractChildLinks(parentLink) {
    try {
        const { data } = await axios.get(parentLink);
        const $ = cheerio.load(data);
        const childLinks = [];

        // 各科目シラバスのリンクを抽出
        $('div.contents_1 a').each((index, element) => {
            let link = $(element).attr('href');
            if (link) {
                const absoluteUrl = new URL(link, parentLink).href;
                if (absoluteUrl.includes('html')) {
                    childLinks.push(absoluteUrl);
                }
            }
        });

        return childLinks;
    } catch (error) {
        console.error('子ファイルから授業リンクを取得中にエラー:', error);
    }
}

// 4. シラバスデータを抽出し、Firebaseに保存
async function scrapeSyllabusData(syllabusUrl) {
    try {
        const { data } = await axios.get(syllabusUrl);
        const $ = cheerio.load(data);

        /*
        例外を処理する関数
        例えば、シラバスの表の左の欄に Message from the Instructor とある場合にInstructorと入っているのでそれを除外したりしています。
        同様に、日本語表記と英語表記がある場合の英語表記のものを除外したりしています。
        （補足）
        includes()メソッドは条件を満たすものを全て持ってきて該当部分を繋げて返すので、このような処理をしています。
        */
        const extractJapaneseField = (keyword) => {
            return $(`td:contains("${keyword}")`).filter(function () {
                return !$(this).text().includes("【英語】") && !$(this).text().includes("Message from the Instructor") && !$(this).text().includes("Theme of First Year Seminar");
            }).next().next().text().trim();
        };

        /*
        let 変数 = extractJapaneseField('シラバスの左表に含まれる語句');
        */
        let undergradGraduate = extractJapaneseField('Undergraduate / Graduate'); // 学部・大学院区分
        let registrationCode = extractJapaneseField('Registration Code'); // 時間割コード
        let courseCategory = extractJapaneseField('Course Category'); // 科目区分
        let courseTitle = extractJapaneseField('Course Title'); // 科目名
        let instructor = extractJapaneseField('Instructor'); // 担当教員
        let termDayPeriod = extractJapaneseField('Term / Day / Period'); // 開講期・開講時間帯
        let credits = extractJapaneseField('Credits'); // 単位数
        let year = extractJapaneseField('Year'); // 対象学年
        let courseStyle = extractJapaneseField('Course style') || extractJapaneseField('Lecture format'); // 授業形態
        let subject = extractJapaneseField('Subject') || extractJapaneseField('Department / Program'); // 学科・専攻
        let requiredSelected = extractJapaneseField('Required / Selected'); // 必修・選択
        let goalsOfCourse = extractJapaneseField('Goals of the Course'); // 授業の目的
        let objectivesOfTheCourse = extractJapaneseField('Objectives of the Course'); // 授業の達成目標
        let courseContent = extractJapaneseField('Course Content'); // 授業の内容
        let coursePrerequisites = extractJapaneseField('Course Prerequisites'); // 履修条件
        let relatedCourses = extractJapaneseField('Related Courses'); // 関連する科目
        let evaluationMethod = extractJapaneseField('Course Evaluation Method and Criteria'); // 成績評価の方法と基準
        let failAbsentCriteria = extractJapaneseField('Criteria for \"Fail (F)\" & \"Absent (W)\" grades'); // 不可(F)と欠席(W)の基準
        let textbook = extractJapaneseField('Textbook'); // 教科書
        let referenceBook = extractJapaneseField('Reference Book'); // 参考書
        let courseWithdrawal = extractJapaneseField('Course withdrawal'); // 履修取り下げ制度
        let attendancePropriety = extractJapaneseField('Propriety of other undergraduate students, other major students, and other graduate students attendance'); // 他学部生、他専攻生、他研究科生の受講の可否
        let otherDeptAttendanceConditions = extractJapaneseField('Conditions for Other department student\'s attendance'); // 他学科聴講の条件

        if (textbook === referenceBook) {
            referenceBook = '';
        }

        if (coursePrerequisites === relatedCourses) {
            relatedCourses = '';
        }

        // 変数を変更または追加した場合は、ここで変更を加えてください
        const syllabusData = {
            syllabusUrl,
            undergradGraduate,
            registrationCode,
            courseCategory,
            courseTitle,
            instructor,
            termDayPeriod,
            credits,
            year,
            courseStyle,
            subject,
            requiredSelected,
            goalsOfCourse,
            objectivesOfTheCourse,
            courseContent,
            coursePrerequisites,
            relatedCourses,
            evaluationMethod,
            failAbsentCriteria,
            textbook,
            referenceBook,
            courseWithdrawal,
            attendancePropriety,
            otherDeptAttendanceConditions
        };

        await setDoc(doc(db, 'syllabus', registrationCode), syllabusData);
        console.log('データがFirestoreに登録されました:', syllabusData);
    } catch (error) {
        console.error('シラバスデータの抽出中にエラー:', error);
    }
}

// 5. 全体の実行フロー
async function scrapeAllSyllabus() {
    try {
        const topParentLinks = await extractTopParentLinks(); // 開講所属リンクを取得
        for (const topParentLink of topParentLinks) {
            const parentLinks = await extractParentLinks(topParentLink); // 科目一覧リンクを取得
            for (const parentLink of parentLinks) {
                const childLinks = await extractChildLinks(parentLink); // シラバスのリンクを取得
                for (const childLink of childLinks) {
                    await scrapeSyllabusData(childLink); // シラバスデータを取得し、Firebaseに保存
                }
            }
        }
    } catch (error) {
        console.error('全体のスクレイピング中にエラーが発生:', error);
    }
}

// 実行
scrapeAllSyllabus();