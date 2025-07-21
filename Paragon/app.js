const API_URL_ITEMS = "http://localhost:3003/items";
const API_URL_RECEIPT = "http://localhost:3003/receipt"; // Adres danych paragonu
let editId = null; // ID elementu do edycji
let deleteId = null; // ID elementu do usunięcia

// Pobranie danych z backendu
async function fetchItems() {
    const response = await fetch(API_URL_ITEMS);
    const items = await response.json();
    renderTable(items);
}

// Funkcja formatowania z wypełnieniem zerami (np. 1 → 01)
function padZero(value) {
    return String(value).padStart(2, "0");
}
// Licznik paragonu - przechowywany w Local Storage
function getReceiptNumber() {
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0].replace(/-/g, ""); // YYYYMMDD
    const counterKey = `receiptCounter_${formattedDate}`; // Klucz licznika na dany dzień

    // Pobierz aktualny licznik z Local Storage
    let counter = localStorage.getItem(counterKey);
    if (!counter) {
        counter = 1; // Jeśli brak licznika, zacznij od 1
    } else {
        counter = parseInt(counter, 10) + 1; // Inkrementuj licznik
    }

    // Zapisz zaktualizowany licznik w Local Storage
    localStorage.setItem(counterKey, counter);

    return `${formattedDate}/${counter.toString().padStart(3, "0")}`; // Format: YYYYMMDD/NNN
}
// Renderowanie tabeli
function renderTable(items) {
    const tbody = document.querySelector("#receipt tbody");
    const totalSum = document.getElementById("totalSum");
    tbody.innerHTML = "";
    let total = 0;

    items.forEach((item, index) => {
        const sum = item.quantity * item.price;
        total += sum;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.name}</td>
            <td>${item.quantity.toFixed(1)}</td>
            <td>${item.price.toFixed(2)} zł</td>
            <td>${sum.toFixed(2)} zł</td>
            <td>
                <button onclick="showEditDialog(${item.id}, '${item.name}', ${item.quantity}, ${item.price})">Edytuj</button>
                <button onclick="showDeleteDialog(${item.id})">Usuń</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    totalSum.textContent = `${total.toFixed(2)} zł`;
}

// Dialog "Dodaj pozycję"
function showAddDialog() {
    document.getElementById("addItemName").value = "";
    document.getElementById("addItemQuantity").value = "";
    document.getElementById("addItemPrice").value = "";
    const dialog = document.getElementById("addDialog");
    dialog.showModal();
}

// Funkcja zamykająca dialog "Dodaj pozycję"
function hideAddDialog() {
    const dialog = document.getElementById("addDialog");
    dialog.close();
}

// Obsługa formularza dodawania pozycji
document.getElementById("addDialog").onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById("addItemName").value;
    const quantity = parseFloat(document.getElementById("addItemQuantity").value);
    const price = parseFloat(document.getElementById("addItemPrice").value);

    // Pobierz istniejące dane, aby znaleźć maksymalne `id`
    const response = await fetch(API_URL_ITEMS);
    const items = await response.json();

    // Znajdź maksymalne `id` i utwórz nowe jako liczba
    const maxId = items.reduce((max, item) => Math.max(max, parseInt(item.id, 10) || 0), 0);
    const newId = maxId + 1;

    // Wyślij dane do backendu z liczbowym `id`
    await fetch(API_URL_ITEMS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newId.toString(), name, quantity, price }),
    });

    hideAddDialog();
    fetchItems(); // Odśwież widok
};


// Dialog "Edytuj pozycję"
function showEditDialog(id, name, quantity, price) {
    editId = id; // Przechowanie ID do późniejszego użycia
    document.getElementById("editItemName").value = name;
    document.getElementById("editItemQuantity").value = quantity;
    document.getElementById("editItemPrice").value = price;
    document.getElementById("editDialog").showModal();
}

// Funkcja zamykająca dialog "Edytuj pozycję"
function hideEditDialog() {
    const dialog = document.getElementById("editDialog");
    dialog.close();
}

// Obsługa formularza edycji pozycji
document.getElementById("editDialog").onsubmit = async (e) => {
    e.preventDefault();
    // Odczytanie wartości z pól formularza
    const name = document.getElementById("editItemName").value;
    const quantity = parseFloat(document.getElementById("editItemQuantity").value);
    const price = parseFloat(document.getElementById("editItemPrice").value);

    // Wysłanie danych do backendu
    await fetch(`${API_URL_ITEMS}/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, quantity, price }),
    });
    hideEditDialog();
    fetchItems();
};

// Dialog "Usuń pozycję"
function showDeleteDialog(id) {
    deleteId = id; // Przechowanie ID do późniejszego użycia
    document.getElementById("deleteDialog").showModal();
}

//  Funkcja zamykająca dialog "Usuń pozycję"
function hideDeleteDialog() {
    const dialog = document.getElementById("deleteDialog");
    dialog.close();
}

// Obsługa przycisku "Usuń" w dialogu   
async function confirmDelete() {
    try {
        await fetch(`${API_URL_ITEMS}/${deleteId}`, { method: "DELETE" });
        hideDeleteDialog();
        fetchItems();
    } catch (error) {
        console.error("Błąd podczas usuwania pozycji:", error);
    }
}



// Funkcja do formatowania daty w formacie DD-MM-YYYY
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// Funkcja ustawiająca tytuł paragonu
async function setReceiptTitle() {
    const receiptTitleElement = document.getElementById("receiptTitle");

    // Pobierz dane paragonu z backendu
    const response = await fetch(API_URL_RECEIPT);
    const receipt = await response.json();

    // Pobierz dzisiejszą datę
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // Miesiące są indeksowane od 0
    const day = today.getDate();

    // Sprawdź, czy data w backendzie jest zgodna z dzisiejszą
    if (receipt.year !== year || receipt.month !== month || receipt.day !== day) {
        // Zresetuj licznik, jeśli data się zmieniła
        receipt.year = year;
        receipt.month = month;
        receipt.day = day;
        receipt.number = 1;
        await updateReceipt(receipt);
    } else {
        // Zwiększ licznik, jeśli to nowy paragon w tej samej dacie
        receipt.number++;
        await updateReceipt(receipt);
    }

    // Ustaw tytuł paragonu
    const receiptNumber = `${year}-${padZero(month)}-${padZero(day)}/${String(receipt.number).padStart(3, "0")}`;
    receiptTitleElement.textContent = `PARAGON ${receiptNumber}`;
}

// Funkcja zapisująca dane paragonu
async function updateItem(id, name, quantity, price) {
    await fetch(`${API_URL_ITEMS}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, quantity, price }),
    });
    fetchItems();
}

// Funkcja aktualizująca dane paragonu w backendzie
async function updateReceipt(receipt) {
    await fetch(API_URL_RECEIPT, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(receipt),
    });
}


// Wywołanie funkcji podczas ładowania strony
setReceiptTitle();
// Inicjalizacja
fetchItems();
