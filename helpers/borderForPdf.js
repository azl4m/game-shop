function addPageBorder(doc) {
    const margin = 20; // Define the margin for the border
    const width = doc.page.width - margin * 2;
    const height = doc.page.height - margin * 2;

    // Draw border
    doc.rect(margin, margin, width, height)
       .stroke(); // Use .fill() if you want a filled border instead
}
module.exports={addPageBorder}