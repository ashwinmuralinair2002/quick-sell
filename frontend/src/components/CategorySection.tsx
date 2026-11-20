import React from 'react';

const categories = [
  { name: 'Mobiles', icon: '📱' },
  { name: 'Wearables', icon: '⌚' },
  { name: 'Audio', icon: '🎧' },
  { name: 'Computers', icon: '💻' },
  { name: 'Accessories', icon: '⌨️' },
  { name: 'Cameras', icon: '📷' }
];

interface CategorySectionProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  selectedCategory,
  onSelectCategory
}) => {
  return (
    <section className="mb-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="fw-bold mb-0 text-slate-800">Browse by Category</h5>
        {selectedCategory && (
          <button
            onClick={() => onSelectCategory('')}
            className="btn btn-link btn-sm text-decoration-none p-0"
          >
            Clear selection
          </button>
        )}
      </div>

      <div className="row g-2 g-md-3">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.name;
          return (
            <div key={cat.name} className="col-4 col-md-2">
              <button
                type="button"
                onClick={() => onSelectCategory(isSelected ? '' : cat.name)}
                className={`category-card w-100 p-3 text-center border-0 ${
                  isSelected ? 'category-card-active' : ''
                }`}
              >
                <div className="category-icon mb-1">{cat.icon}</div>
                <div className="category-title">{cat.name}</div>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default CategorySection;
