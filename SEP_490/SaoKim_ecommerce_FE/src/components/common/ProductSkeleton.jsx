import React from 'react';
import { Card, Placeholder } from 'react-bootstrap';
import '../../styles/home.css'; // Ensure we have access to luxury-card styles

const ProductSkeleton = () => {
    return (
        <Card className="luxury-card" aria-hidden="true">
            <div className="luxury-card-img-wrapper" style={{ background: '#f0f0f0' }}>
                {/* Placeholder for Image */}
                <Placeholder as="div" animation="glow" style={{ width: '100%', height: '100%' }}>
                    <Placeholder xs={12} style={{ height: '100%', borderRadius: '8px' }} />
                </Placeholder>
            </div>
            <Card.Body className="luxury-card-body">
                {/* Placeholder for Category */}
                <Placeholder as="div" animation="glow" className="mb-2">
                    <Placeholder xs={5} size="xs" />
                </Placeholder>

                {/* Placeholder for Title */}
                <Placeholder as="Card.Title" animation="glow" className="mb-3">
                    <Placeholder xs={10} />
                    <Placeholder xs={8} />
                </Placeholder>

                {/* Placeholder for Price */}
                <Placeholder as="div" animation="glow">
                    <Placeholder xs={6} size="lg" />
                </Placeholder>
            </Card.Body>
        </Card>
    );
};

export default ProductSkeleton;
