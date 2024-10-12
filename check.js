// FirebaseモジュールをESモジュールとしてインポート
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Firebaseコンフィグの設定
const firebaseConfig = {
    apiKey: "AIzaSyBMiBBPBV19e-t0f4BUZ6uvkJMlorW_EeQ",
    authDomain: "sample-5d8fd.firebaseapp.com",
    projectId: "sample-5d8fd",
    storageBucket: "sample-5d8fd.appspot.com",
    messagingSenderId: "397389437618",
    appId: "1:397389437618:web:8414b04eab0e61f670c7ab",
    measurementId: "G-CK57HQ39NX"
};

// Firebaseアプリの初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 確認したいドキュメントIDのリスト
const docIds = [
    '0030006', '0025309', '0085206', '0030001', '0030082', '0082201', '0085211', '0080001', 
    '0024204', '0035473', '0040081', '0164116', '0140006', '2022821', '2025109', '2013029',
    '4042702', '0200051', '0210220', '0264005', '2221040', '2221140', '2221520', '2221620',
    '2220050', '2211760', '2213020', '0385121', '0380055', '2300560', '2302871', '4301800',
    '4302930', '9311600', '9320500', '9350500', '9364000', '9330402', '9340300', '0410042',
    '0480129', '0416022', '0409200', '2412108', '2493434', '2413606', '1000050', '1002995',
    '1002345', '1008020', '2560080', '2500005', '2510048', '2560108', '2500011', '2530036',
    '4560120', '4590001', '4500013', '5900325'
];

// コレクション名
const collectionName = 'syllabus';  // コレクション名を変更する場合はここを修正

async function fetchDocuments() {
    try {
        const fetchPromises = docIds.map(async (docId) => {
            const docRef = doc(db, collectionName, docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                console.log(`ドキュメントID ${docId} の内容: `, docSnap.data());
            } else {
                console.log(`ドキュメントID ${docId} は存在しません。`);
            }
        });

        // 全てのドキュメント取得処理が完了するまで待つ
        await Promise.all(fetchPromises);

    } catch (error) {
        console.error("エラーが発生しました: ", error);
    }
}

// ドキュメント確認の実行
fetchDocuments();